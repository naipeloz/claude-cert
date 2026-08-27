/**
 * DOMINIO 1 · Diseño de agentes (27%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Quién decide el orden de los pasos: el modelo o el código?»
 *
 * Acá lo decide el código. Cinco pasos fijos, uno por llamada, con una traza que se
 * imprime al final. La alternativa —un agente suelto con las tres tools y "resolvé el
 * ticket"— también funciona, y es la que no se puede depurar, ni medir, ni mostrar en
 * vivo, porque cada corrida elige un camino distinto. El modelo decide QUÉ decir en cada
 * paso; el código decide QUÉ PASOS HAY.
 *
 * Ver: decisions/D-01-buscador-tool-o-subagente.md · decisions/D-08-fanout-paralelo.md
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { MCP_SOPORTE, MODELO, MODELO_CLASIFICADOR } from '../config.ts';
import { INVESTIGADOR, REDACTOR } from './subagents.ts';
import { soporteMcp, TOOLS_SOPORTE } from '../mcp/server.ts';
import {
  compactar,
  conReintento,
  decidirEscalado,
  UMBRALES,
  type EstadoTicket,
} from '../context/policy.ts';
import {
  Categoria,
  extraerJson,
  schemaParaPrompt,
  Severidad,
  validar,
  type Evidencia,
  type TicketInsight,
} from '../schemas/ticketInsight.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
export type Ticket = { id: string; asunto: string; cuerpo: string };
export type PasoTraza = { paso: string; detalle: string };
export type Resultado = { insight: TicketInsight; traza: PasoTraza[]; fallosDeSchema: number; regla: string };


/** Carga un prompt, le saca la cabecera de dominio y sustituye los {{PLACEHOLDERS}}. */
function cargarPrompt(nombre: string, vars: Record<string, string>): string {
  // La cabecera de dominio va en comentario HTML justamente para poder sacarla acá: la
  // regla del repo no tiene excepciones, y el modelo no tiene por qué leerla.
  const crudo = readFileSync(join(DIR, '..', 'prompts', `${nombre}.md`), 'utf8');
  const sinCabecera = crudo.replace(/^<!--[\s\S]*?-->\s*/, '');
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), sinCabecera);
}

/** Base común de toda llamada. Ver el comentario de settingSources, que es el que importa. */
const BASE: Options = {
  /**
   * settingSources: [] es obligatorio y es el error más fácil de cometer. Este repo tiene
   * tres CLAUDE.md, pero son instrucciones para Claude Code cuando alguien programa acá.
   * Sin esta línea el agente de soporte los cargaría, y estaría leyendo el checklist de
   * cómo agregar una tool mientras le responde a un cliente que no puede exportar un PDF.
   */
  settingSources: [],
  /** Sin Read, Bash ni Write: este agente lee tres arrays, no un disco. */
  tools: [],
  permissionMode: 'bypassPermissions',
};

/** Una llamada al modelo. Devuelve su texto final y el material bruto que pasó por las tools. */
async function correr(prompt: string, opciones: Options) {
  const materialBruto: string[] = [];
  let toolsCaidas = 0;
  let texto = '';
  // Turnos en los que el modelo emitió al menos una llamada a tool. Comparado contra la
  // cantidad de llamadas, dice si el fan-out salió paralelo o secuencial — ver D-08.
  let turnosDeTools = 0;

  const flujo = query({ prompt, options: { ...BASE, ...opciones } }) as AsyncIterable<SDKMessage>;
  for await (const m of flujo) {
    if (m.type === 'assistant' && Array.isArray(m.message.content)) {
      if (m.message.content.some((b) => (b as { type?: string }).type === 'tool_use')) turnosDeTools++;
    }    if (m.type === 'user' && typeof m.message === 'object' && Array.isArray(m.message.content)) {
      // Todo lo que devolvieron las tools, literal. Esto es lo que después se descarta.
      for (const b of m.message.content as Array<{ type?: string; content?: unknown; is_error?: boolean }>) {
        if (b?.type !== 'tool_result') continue;
        if (b.is_error) toolsCaidas++;
        materialBruto.push(JSON.stringify(b.content));
      }
    }
    if (m.type === 'result') {
      // is_error puede venir true CON subtype 'success': es un error de API y `result`
      // trae el texto del error, no la respuesta. Sin este chequeo se procesaría como si
      // fuera la salida del modelo, que es un fallo silencioso de los caros.
      if (m.subtype !== 'success') throw new Error(`la llamada terminó en ${m.subtype}`);
      if (m.is_error) throw new Error(`error de API${m.api_error_status ? ` ${m.api_error_status}` : ''}: ${m.result}`);
      texto = m.result;
    }
  }
  return { texto, materialBruto, toolsCaidas, turnosDeTools };
}

/**
 * Clasificar NO usa subagente ni tools, y esa ausencia es una decisión.
 *
 * Es una pasada sobre un texto corto contra cinco categorías: no hay contexto que aislar
 * (nada que descartar) ni un rol distinto que sostener (no escribe para nadie). Meter un
 * subagente acá es exactamente la trampa del dominio 1: se ve arquitectónico y lo único
 * que agrega es un salto de proceso y una ventana de contexto más para mantener.
 */
async function clasificar(t: Ticket) {
  // extraerJson va DENTRO del reintento: que el modelo devuelva algo que no parsea es un
  // fallo transitorio como cualquier otro y merece el mismo reintento que un timeout.
  const b = (await conReintento(
    async () => {
      const p = cargarPrompt('classify', { ASUNTO: t.asunto, CUERPO: t.cuerpo });
      return extraerJson((await correr(p, { model: MODELO_CLASIFICADOR, maxTurns: 1 })).texto);
    },
    UMBRALES.maxReintentos,
    'clasificar',
  )) as Record<string, unknown>;
  return {
    categoria: Categoria.catch('otro').parse(b.categoria),
    severidad: Severidad.catch('media').parse(b.severidad),
    mencionaCancelar: b.menciona_cancelar === true,
  };
}

type Hallazgo = Evidencia & { por_que?: string };
/**
 * Si la investigación falla del todo, el ticket NO se cae: vuelve vacía y con una fuente
 * marcada como caída, que es lo que hace disparar la regla "fuentes-incompletas".
 *
 * Es el mismo criterio que aplica el orquestador cuando el redactor no produce una salida
 * válida, un nivel más arriba: un paso que falla devuelve una señal de escalado, no una
 * excepción. Lanzar acá haría que un ticket que no se pudo investigar desaparezca del
 * dashboard, cuando es justamente el que alguien tiene que mirar.
 */
async function investigar(t: Ticket) {
  return conReintento(
    async () => {
      const c = await correr(`Ticket ${t.id}\nAsunto: ${t.asunto}\n\n${t.cuerpo}`, {
        agent: 'investigador', agents: { investigador: INVESTIGADOR },
        mcpServers: { [MCP_SOPORTE]: soporteMcp },
        allowedTools: TOOLS_SOPORTE, tools: TOOLS_SOPORTE,
      });
      const b = extraerJson(c.texto) as { hallazgos?: Hallazgo[]; notas?: string };
      const hallazgos = (b.hallazgos ?? []).filter((h) => h?.id && h?.cita);
      return { hallazgos, notas: b.notas ?? '', materialBruto: c.materialBruto, toolsCaidas: c.toolsCaidas, turnosDeTools: c.turnosDeTools };
    },
    UMBRALES.maxReintentos,
    'investigar',
  ).catch((e: unknown) => ({
    hallazgos: [] as Hallazgo[],
    notas: `La investigación no se pudo completar: ${e instanceof Error ? e.message : String(e)}`,
    materialBruto: [] as string[],
    toolsCaidas: 1,
    turnosDeTools: 0,
  }));
}

export async function procesarTicket(t: Ticket): Promise<Resultado> {
  const traza: PasoTraza[] = [];
  const anotar = (paso: string, detalle: string) => traza.push({ paso, detalle });
  // 1 · Clasificar
  const clase = await clasificar(t);
  const cancela = clase.mencionaCancelar ? ' · menciona cancelar' : '';
  anotar('clasificado', `${clase.categoria} · severidad ${clase.severidad}${cancela} (${MODELO_CLASIFICADOR}, sin tools, sin subagente)`);

  // 2 · Investigar: fan-out sobre las tres fuentes dentro del subagente
  const inv = await investigar(t);
  let estado: EstadoTicket = {
    materialBruto: inv.materialBruto,
    evidencia: inv.hallazgos.map(({ fuente, id, cita }) => ({ fuente, id, cita: cita.slice(0, 400) })),
  };
  const caidas = inv.toolsCaidas > 0 ? ` · ${inv.toolsCaidas} fallo(s) de tool` : '';
  // La forma del fan-out se imprime en cada corrida a propósito: D-08 afirma algo sobre el
  // paralelismo y una afirmación sobre el comportamiento del modelo que no se mide es una
  // suposición. Acá se ve, corrida por corrida, si se cumplió.
  const vueltas = inv.turnosDeTools;
  const forma = vueltas <= 1 ? 'paralelo' : vueltas >= inv.materialBruto.length ? 'secuencial' : 'parcial';
  anotar('investigado', `${inv.materialBruto.length} llamadas en ${vueltas} turno(s) → ${forma} → ${estado.evidencia.length} citas${caidas}`);

  // 3 · Compactar: se descarta el material bruto entero, se conservan las citas
  const comp = compactar(estado);
  estado = comp.estado;
  const kb = (comp.bytesDescartados / 1024).toFixed(1);
  anotar('compactado', `${kb} KB de material bruto descartados, ${comp.citasConservadas} citas conservadas`);

  // 4 · Redactar y estructurar, con reintento contra los errores redactados de validar()
  const HALLAZGOS = inv.hallazgos.length
    ? `${inv.hallazgos.map((h) => `[${h.id}] (${h.fuente}) ${h.cita}`).join('\n\n')}\n\nNotas: ${inv.notas}`
    : `Ninguna fuente cubrió el caso. Notas del investigador: ${inv.notas}`;
  const promptBase = cargarPrompt('compose', {
    TICKET_ID: t.id, ASUNTO: t.asunto, CUERPO: t.cuerpo,
    CATEGORIA: clase.categoria, SEVERIDAD: clase.severidad,
    SCHEMA: schemaParaPrompt(), HALLAZGOS,
  });

  let insight: TicketInsight | null = null;
  let fallosDeSchema = 0;
  let correccion = '';
  while (insight === null && fallosDeSchema <= UMBRALES.maxFallosDeSchema) {
    const opciones = { agent: 'redactor', agents: { redactor: REDACTOR }, model: MODELO };
    const { texto } = await correr(promptBase + correccion, opciones);
    let v: ReturnType<typeof validar>;
    try {
      v = validar(extraerJson(texto));
    } catch (e) {
      const que = (e as Error).message;
      v = { ok: false, reintentable: true, errores: [`Tu respuesta no era JSON: ${que}. Devolvé únicamente el objeto, sin texto alrededor.`] };
    }
    if (v.ok) { insight = v.valor; break; }
    fallosDeSchema++;
    anotar('schema-invalido', `intento ${fallosDeSchema}: ${v.errores.join(' · ')}`);
    if (!v.reintentable) break;
    // Al modelo le vuelven los errores redactados de validar(), nunca un stack trace.
    correccion = `\n\n## Corrección\n\nTu respuesta anterior no fue válida:\n${v.errores.map((e) => `- ${e}`).join('\n')}\n\nDevolvé el objeto JSON completo y corregido.`;
  }

  /**
   * Rendirse bien es parte del diseño: acá no se lanza una excepción.
   *
   * Un throw le pasa el problema al que llama, que no tiene más información que nosotros
   * para decidir qué hacer. Un insight con requiere_humano: true es una salida válida del
   * sistema, entra al mismo dashboard que las demás y dice exactamente qué falló.
   */
  if (insight === null) {
    anotar('rendicion', `sin salida válida tras ${fallosDeSchema} intento(s): va a una persona`);
    insight = {
      ticket_id: t.id, categoria: clase.categoria, severidad: clase.severidad, confianza: 0,
      resumen: `No se pudo generar una respuesta automática para ${t.id}.`,
      respuesta_sugerida: '', evidencia: estado.evidencia, requiere_humano: true,
      motivo_escalado: `El modelo no produjo una salida válida en ${fallosDeSchema} intentos.`,
    };
  }

  // 5 · Decidir escalado. La política manda sobre la opinión del modelo.
  const decision = decidirEscalado({
    confianza: insight.confianza, severidad: insight.severidad,
    cantidadEvidencia: insight.evidencia.length, fallosDeSchema,
    toolsCaidas: inv.toolsCaidas, clienteMencionaCancelar: clase.mencionaCancelar,
  });
  if (decision.requiereHumano) {
    insight = { ...insight, requiere_humano: true, motivo_escalado: decision.motivo };
  }
  const d = decision.requiereHumano ? `SÍ → regla "${decision.regla}": ${decision.motivo}` : 'no · respuesta automática';
  anotar('escalado', d);

  return { insight, traza, fallosDeSchema, regla: decision.regla };
}
