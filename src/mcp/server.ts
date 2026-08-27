/**
 * DOMINIO 4 · Herramientas y MCP (18%)
 *
 * Pregunta de examen que responde este archivo:
 *   «¿Cómo diseñás una tool para que el modelo la use bien y se recupere cuando falla?»
 *
 * Tres tools sobre tres fuentes. Dos criterios que se leen en cada una: la descripción
 * dice cuándo usarla Y cuándo no (la descripción es prompt, no documentación), y todo
 * camino de error devuelve qué pasó, por qué y cuál es el próximo paso concreto.
 * Cero resultados no es un error: es un resultado con instrucciones.
 *
 * Ver: decisions/D-04-errores-para-el-modelo.md · decisions/D-06-mcp-in-process.md
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { MCP_SOPORTE, toolMcp } from '../config.ts';
import { changelog, kb, ticketsPrevios } from '../data/fuentes.ts';

const texto = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

/** Un error es accionable cuando el modelo puede leerlo y decidir qué hacer distinto. */
const errorAccionable = (t: string) => ({ content: [{ type: 'text' as const, text: t }], isError: true });

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Solapamiento de términos. Deliberadamente tonto: la calidad de búsqueda no es el punto del repo. */
function puntaje(consulta: string, ...campos: string[]): number {
  const terminos = [...new Set(normalizar(consulta).split(/[^a-z0-9]+/).filter((t) => t.length > 3))];
  const heno = normalizar(campos.join(' '));
  return terminos.reduce((n, t) => n + (heno.includes(t) ? 1 : 0), 0);
}

/**
 * Cero resultados es el camino más importante de todos, porque es donde un agente mal
 * diseñado inventa. La respuesta no dice "no encontré nada": dice qué hacer ahora, y
 * acota el reintento a uno para que el modelo no entre en bucle reformulando.
 */
const sinResultados = (fuente: string, consulta: string, alternativa: string) =>
  texto(
    `Sin resultados en ${fuente} para "${consulta}". Esto no es un fallo de la herramienta: ` +
      `la fuente no cubre el tema. Próximo paso: reformulá UNA vez con los términos que usaría ` +
      `el producto en vez de los que usó el cliente (${alternativa}). Si la segunda consulta ` +
      `tampoco devuelve nada, no insistas: dalo por no cubierto y marcá requiere_humano: true.`,
  );

const buscarKb = tool(
  'buscar_kb',
  'Busca en la base de conocimiento de Reportly: cómo funciona el producto, procedimientos ' +
    'y políticas vigentes. Úsala para responder "cómo se hace X" o "qué pasa si Y". ' +
    'NO la uses para saber si un bug ya fue corregido: para eso está consultar_changelog. ' +
    'NO la uses para saber cómo se resolvió un caso parecido: para eso está buscar_tickets_previos.',
  {
    consulta: z
      .string()
      .describe('Términos del producto, no la queja del cliente. Ej: "exportar PDF tabla ancha"'),
    max_resultados: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional()
      .describe('Cuántos artículos devolver, de 1 a 5. Ej: 3. Por defecto 3.'),
  },
  async ({ consulta, max_resultados }) => {
    if (consulta.trim().length < 3) {
      return errorAccionable(
        `La consulta "${consulta}" es demasiado corta para buscar. Necesito al menos tres ` +
          `caracteres con los términos del tema, por ejemplo "restablecer 2FA". Volvé a llamar ` +
          `con una consulta más específica.`,
      );
    }
    const tope = max_resultados ?? 3;
    const hits = kb
      .map((a) => ({ a, p: puntaje(consulta, a.titulo, a.cuerpo) }))
      .filter((h) => h.p > 0)
      .sort((x, y) => y.p - x.p)
      .slice(0, tope);

    if (hits.length === 0) return sinResultados('la base de conocimiento', consulta, 'por ejemplo "exportar" en vez de "bajar el informe"');

    return texto(hits.map(({ a }) => `[${a.id}] ${a.titulo}\n${a.cuerpo}`).join('\n\n'));
  },
);

const consultarChangelog = tool(
  'consultar_changelog',
  'Consulta el changelog de releases de Reportly. Es la ÚNICA fuente para saber si un ' +
    'defecto ya fue corregido, en qué versión, y si un cambio de comportamiento fue ' +
    'intencional. Úsala siempre que el cliente reporte algo que "antes funcionaba" o que ' +
    'parezca un bug. NO la uses para explicar cómo se usa una función: para eso está buscar_kb.',
  {
    consulta: z
      .string()
      .describe('El síntoma o el área afectada. Ej: "tabla cortada exportación PDF"'),
    desde_version: z
      .string()
      .optional()
      .describe('Filtra a esta versión y posteriores. Ej: "v4.2.0". Omitilo si no la sabés.'),
  },
  async ({ consulta, desde_version }) => {
    let entradas = changelog;

    if (desde_version !== undefined) {
      if (!/^v\d+\.\d+\.\d+$/.test(desde_version.trim())) {
        return errorAccionable(
          `No pude interpretar la versión "${desde_version}". El formato es la letra v seguida ` +
            `de tres números separados por puntos, por ejemplo v4.2.0. Volvé a llamar con ese ` +
            `formato, u omití el parámetro para ver el changelog completo.`,
        );
      }
      const clave = (v: string) => v.slice(1).split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);
      entradas = changelog.filter((e) => clave(e.version) >= clave(desde_version.trim()));
      if (entradas.length === 0) {
        return texto(
          `No hay releases en ${desde_version} ni posteriores; la última publicada es ` +
            `${changelog[changelog.length - 1]?.version}. Próximo paso: volvé a llamar sin ` +
            `desde_version para ver el changelog completo.`,
        );
      }
    }

    const hits = entradas
      .map((e) => ({ e, p: puntaje(consulta, e.texto, e.version) }))
      .filter((h) => h.p > 0)
      .sort((x, y) => y.p - x.p);

    if (hits.length === 0) return sinResultados('el changelog', consulta, 'nombrá el área del producto, por ejemplo "exportación" o "reportes programados"');

    return texto(hits.map(({ e }) => `[${e.version}] ${e.fecha} · ${e.tipo}\n${e.texto}`).join('\n\n'));
  },
);

const buscarTicketsPrevios = tool(
  'buscar_tickets_previos',
  'Busca entre tickets ya resueltos de otros clientes, con la resolución que funcionó. ' +
    'Úsala para saber cómo se resolvió antes un caso parecido y para detectar que el ticket ' +
    'actual es un duplicado. NO la uses como fuente de verdad sobre el producto: una ' +
    'resolución vieja puede haber quedado desactualizada por un release posterior, así que ' +
    'lo que encuentres acá contrastalo con consultar_changelog.',
  {
    consulta: z.string().describe('El síntoma tal como lo contaría un cliente. Ej: "no puedo entrar, perdí el celular"'),
    excluir_ticket: z
      .string()
      .optional()
      .describe('Id del ticket que estás resolviendo, para no encontrarte a vos mismo. Ej: "TCK-1003"'),
  },
  async ({ consulta, excluir_ticket }) => {
    let candidatos = ticketsPrevios;

    if (excluir_ticket !== undefined) {
      if (!/^TCK-\d{4}$/.test(excluir_ticket.trim())) {
        return errorAccionable(
          `No pude interpretar el identificador ${excluir_ticket}. El formato es TCK seguido de ` +
            `guion y cuatro dígitos, por ejemplo TCK-9931. Volvé a llamar con ese formato, u omití ` +
            `el parámetro si no lo conocés.`,
        );
      }
      candidatos = ticketsPrevios.filter((t) => t.id !== excluir_ticket.trim());
    }

    const hits = candidatos
      .map((t) => ({ t, p: puntaje(consulta, t.asunto, t.cuerpo, t.resolucion) }))
      .filter((h) => h.p > 0)
      .sort((x, y) => y.p - x.p)
      .slice(0, 3);

    if (hits.length === 0) return sinResultados('los tickets previos', consulta, 'usá el síntoma y no la causa, por ejemplo "cobro duplicado" en vez de "error de facturación"');

    return texto(
      hits.map(({ t }) => `[${t.id}] ${t.asunto}\n${t.cuerpo}\nResolución: ${t.resolucion}`).join('\n\n'),
    );
  },
);

/**
 * Servidor MCP in-process, no stdio.
 *
 * Estas tres fuentes son de este agente y de nadie más. Un servidor separado agrega un
 * proceso que desplegar, un contrato que versionar y un modo de falla nuevo (el proceso
 * no arranca), a cambio de un reuso que hoy no existe. Cuando exista otro consumidor,
 * mover esto a stdio es cambiar este archivo y la línea de mcpServers del orquestador.
 */
export const soporteMcp = createSdkMcpServer({
  name: MCP_SOPORTE,
  version: '1.0.0',
  tools: [buscarKb, consultarChangelog, buscarTicketsPrevios],
});

/** Los nombres calificados, tal como los ve el modelo. Es lo que va en allowedTools. */
export const TOOLS_SOPORTE = [
  toolMcp('buscar_kb'),
  toolMcp('consultar_changelog'),
  toolMcp('buscar_tickets_previos'),
];
