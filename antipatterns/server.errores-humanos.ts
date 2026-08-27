/**
 * ANTIPATRÓN · Errores escritos para humanos
 *
 * Qué está mal: las mismas tres tools que src/mcp/server.ts, con los caminos de error
 * resueltos como los resolvería una API REST. Códigos de estado, `null` cuando no hay nada,
 * y excepciones que suben sin mensaje. Nada de esto está roto: está escrito para un
 * desarrollador que va a leer la documentación, y del otro lado hay un modelo que solo
 * tiene ese string.
 *
 * Lo que cuesta: el modelo reintenta con exactamente los mismos parámetros, dos o tres
 * veces, porque el mensaje no le dio ninguna información nueva. Después responde igual sin
 * esa fuente, y la respuesta al cliente sale peor sin que nada haya fallado visiblemente.
 *
 * Prueba de lectura: leé cada error de abajo poniéndote en el lugar del modelo, con nada
 * más que ese texto. ¿Sabrías qué cambiar en la próxima llamada?
 *
 * La versión buena: src/mcp/server.ts
 * Ver: decisions/D-04-errores-para-el-modelo.md
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { changelog, kb, ticketsPrevios } from '../src/data/fuentes.ts';

const texto = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

export const buscarKbMal = tool(
  'buscar_kb',
  // La descripción dice QUÉ hace y no dice cuándo NO usarla ni cuál es la alternativa.
  // Con esto, el modelo va a buscar acá si un bug ya se corrigió, que es lo que no hay
  // que hacer, y va a encontrar un artículo que parece responder y no responde.
  'Busca artículos en la base de conocimiento.',
  {
    // .describe() que repite el nombre del campo: cero información sobre cómo llamarla bien.
    consulta: z.string().describe('La consulta'),
    max_resultados: z.number().optional().describe('Máximo de resultados'),
  },
  async ({ consulta, max_resultados }) => {
    // Un 400 le dice al modelo que algo estuvo mal. No le dice qué, ni qué se espera, ni
    // qué puede hacer distinto. El reintento va a ser idéntico al primer intento.
    if (consulta.trim().length < 3) {
      return { content: [{ type: 'text' as const, text: 'Error 400: Bad Request' }], isError: true };
    }
    const hits = kb.filter((a) => a.cuerpo.includes(consulta)).slice(0, max_resultados ?? 3);
    // Cero resultados devuelto como null. El modelo tiene que adivinar si la fuente no
    // cubre el tema, si la consulta estaba mal escrita, o si la tool falló. Elegir mal
    // entre esas tres lleva a insistir para siempre o a inventar.
    return hits.length ? texto(JSON.stringify(hits)) : texto('null');
  },
);

export const consultarChangelogMal = tool(
  'consultar_changelog',
  'Consulta el changelog.',
  {
    consulta: z.string().describe('La consulta'),
    desde_version: z.string().optional().describe('Versión desde la cual filtrar'),
  },
  async ({ consulta, desde_version }) => {
    // Excepción sin mensaje útil. Sube como fallo de la tool y el modelo ve un texto
    // genérico donde debería ver "el formato es v4.2.0, volvé a llamar así".
    if (desde_version && !/^v\d+\.\d+\.\d+$/.test(desde_version)) {
      throw new Error('Invalid version format');
    }
    return texto(JSON.stringify(changelog.filter((e) => e.texto.includes(consulta))));
  },
);

export const buscarTicketsPreviosMal = tool(
  'buscar_tickets_previos',
  'Busca tickets previos.',
  {
    consulta: z.string().describe('La consulta'),
    excluir_ticket: z.string().optional().describe('Ticket a excluir'),
  },
  async ({ consulta, excluir_ticket }) => {
    // El caso canónico. Compará este mensaje con el de src/mcp/server.ts: el mismo fallo,
    // la misma validación, y la diferencia entera está en qué se le devuelve al modelo.
    if (excluir_ticket && !/^TCK-\d{4}$/.test(excluir_ticket)) {
      return { content: [{ type: 'text' as const, text: 'Error 422: Unprocessable Entity' }], isError: true };
    }
    const hits = ticketsPrevios.filter((t) => t.cuerpo.includes(consulta));
    // Y acá el silencio: devolver el array vacío sin decir nada. Es la versión educada de
    // null, con el mismo problema — no hay próximo paso, así que el modelo se inventa uno.
    return texto(JSON.stringify(hits));
  },
);
