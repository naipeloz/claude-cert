/**
 * DOMINIO 1 · Diseño de agentes (27%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Cuándo algo merece ser un subagente y cuándo alcanza con una tool?»
 *
 * Exactamente dos subagentes. Ni uno más. Cada subagente extra cuesta latencia, tokens y
 * superficie de falla; lo difícil no es agregar el tercero, es justificarlo. Los dos que
 * quedan están por razones DISTINTAS —uno por contexto, otro por rol— y ese contraste es
 * el criterio completo del dominio: si un candidato no entra en ninguna de las dos, es
 * un paso de código o una tool, no un agente.
 *
 * Ver: decisions/D-01-buscador-tool-o-subagente.md
 */

import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { MODELO } from '../config.ts';
import { TOOLS_SOPORTE } from '../mcp/server.ts';

/**
 * Existe POR EL CONTEXTO.
 *
 * Hace fan-out sobre tres fuentes y puede leer diez documentos para quedarse con cuatro
 * citas. Si esto viviera en el hilo principal, el orquestador llegaría al paso de redactar
 * con la ventana llena de material descartado — artículos que no aplicaban, entradas de
 * changelog de otra versión, tickets parecidos que no eran. El subagente existe para que
 * ese material muera con él y al hilo principal vuelvan solo las citas.
 *
 * Es el mismo criterio que aplica compactar() en src/context/policy.ts, resuelto un paso
 * antes: lo mejor que se puede hacer con material bruto es que nunca entre.
 */
export const INVESTIGADOR: AgentDefinition = {
  description:
    'Investiga un ticket de soporte en la base de conocimiento, el changelog y los tickets previos, y devuelve solo las citas relevantes.',
  model: MODELO,
  tools: TOOLS_SOPORTE,
  maxTurns: 6,
  prompt: `Investigás tickets de soporte de Reportly, una herramienta SaaS de reportes.

Tenés tres herramientas y las tres fuentes son distintas: la base de conocimiento dice cómo
funciona el producto, el changelog dice qué se rompió y qué se arregló, y los tickets previos
dicen cómo se resolvió antes. Ninguna reemplaza a las otras.

Empezá SIEMPRE llamando a las tres en el mismo turno, en paralelo, con una consulta pensada
para cada una. No las llames de a una esperando el resultado de la anterior: no dependen entre
sí y hacerlo secuencial solo agrega latencia. Después de ese primer turno, si algo quedó
abierto, hacé como mucho una segunda ronda de consultas.

Si una tool devuelve un error, leelo: te dice qué corregir. Corregí y volvé a llamar una vez.
Si vuelve a fallar, seguí sin esa fuente y anotalo en \`fuentes_caidas\`.
Si una tool no devuelve resultados, eso NO es un error: es información. Reformulá una vez con
los términos que usaría el producto y, si tampoco hay nada, dalo por no cubierto.

Terminás devolviendo únicamente un objeto JSON, sin texto alrededor y sin bloque de código:

{"hallazgos": [{"fuente": "kb"|"changelog"|"tickets_previos", "id": "...", "cita": "...", "por_que": "..."}],
 "fuentes_caidas": ["..."],
 "notas": "..."}

- \`id\`: el identificador exacto que devolvió la tool, entre corchetes (KB-014, v4.2.1, TCK-0803).
- \`cita\`: el fragmento literal de la fuente que sostiene el hallazgo. Máximo 400 caracteres.
- \`por_que\`: una línea sobre qué parte del ticket responde esa cita.
- Solo hallazgos que respondan ALGO del ticket. Cuatro citas que sirven valen más que diez que llenan.
- Si ninguna fuente cubre el caso, devolvé \`hallazgos: []\` y decilo en \`notas\`. Es un resultado válido y útil: no inventes una cita para no volver con las manos vacías.`,
};

/**
 * Existe POR EL ROL.
 *
 * tools: [] es la decisión, no una omisión. Escribirle a un cliente enojado es una tarea
 * con criterio propio y un prompt que no se parece en nada al de investigar; mezclar los
 * dos roles en un agente da uno que investiga a medias y escribe a medias.
 *
 * Y sin herramientas no puede completar con una búsqueda de último momento lo que la
 * investigación no encontró. Esa imposibilidad es el punto: obliga a que la falta de
 * evidencia se note y termine en un escalado, en vez de taparse con una frase plausible.
 */
export const REDACTOR: AgentDefinition = {
  description:
    'Redacta la respuesta al cliente y arma el JSON estructurado, usando solo la evidencia que le pasa el orquestador.',
  model: MODELO,
  tools: [],
  maxTurns: 1,
  prompt: `Redactás respuestas de soporte de Reportly y devolvés el resultado estructurado.

No tenés herramientas, a propósito: trabajás únicamente con la evidencia que te pasa el
orquestador. Si esa evidencia no alcanza para responder, tu trabajo NO es aproximar una
respuesta razonable, es decir que no alcanza y devolver requiere_humano: true.

Las instrucciones completas de cada caso vienen en el mensaje del usuario. Devolvés siempre
un único objeto JSON, sin texto alrededor y sin bloque de código.`,
};
