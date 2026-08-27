/**
 * ANTIPATRÓN · Cinco subagentes donde alcanzaban dos
 *
 * Qué está mal: cada paso del flujo se convirtió en un subagente, incluido clasificar —una
 * pasada sobre un texto de dos líneas contra cinco categorías. El criterio que se aplicó
 * fue "¿esto es un paso distinto?", que responde que sí siempre. El criterio correcto es
 * "¿esto lee mucho más de lo que devuelve, o tiene un rol propio?", que acá responde que sí
 * dos veces.
 *
 * Lo que cuesta: cinco arranques de agente por ticket en vez de dos llamadas y un subagente;
 * cinco prompts que se desincronizan entre sí; y una traza donde nadie puede decir en qué
 * paso se perdió una cita, porque cada uno recibe el resumen del anterior.
 *
 * Lo peor no se ve acá: `clasificadorAgente` y `escaladorAgente` no tienen tools y no
 * aíslan nada, así que lo único que agregan es latencia. Y `escaladorAgente` mueve una
 * decisión de negocio auditable —cuándo va a una persona— a un prompt, donde ya no se puede
 * responder "¿por qué escaló este ticket?" con una línea.
 *
 * La versión buena: src/agents/orchestrator.ts · src/agents/subagents.ts
 * Ver: decisions/D-01-buscador-tool-o-subagente.md
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

// Cinco definiciones de agente. Las tres del medio no aíslan contexto ni sostienen un rol:
// existen porque el diagrama quedaba lindo con cinco cajas.
const AGENTES = {
  clasificador: {
    description: 'Clasifica el ticket en una categoría y una severidad',
    // Sin tools y sobre un texto de dos líneas: no hay nada que aislar. Esto es una llamada.
    tools: [],
    prompt: 'Clasificás tickets de soporte...',
  },
  buscadorKb: {
    description: 'Busca en la base de conocimiento',
    tools: ['mcp__soporte__buscar_kb'],
    prompt: 'Buscás en la base de conocimiento...',
  },
  buscadorChangelog: {
    description: 'Busca en el changelog',
    tools: ['mcp__soporte__consultar_changelog'],
    prompt: 'Buscás en el changelog...',
  },
  redactor: {
    description: 'Redacta la respuesta al cliente',
    tools: [],
    prompt: 'Redactás respuestas de soporte...',
  },
  escalador: {
    description: 'Decide si el ticket necesita intervención humana',
    tools: [],
    // Acá se fue la política. Antes era una lista ordenada de seis reglas que se leía de un
    // vistazo; ahora es un párrafo y la respuesta cambia entre corridas.
    prompt: 'Decidís si un ticket necesita que lo mire una persona. Considerá la confianza, la severidad y si el cliente parece molesto...',
  },
};

/**
 * Y encima el orquestador delega el ORDEN al modelo: un agente principal con la tool Task
 * y una instrucción en prosa. Cada corrida elige un camino distinto, así que no se puede
 * depurar, no se puede medir y no se puede mostrar en vivo. La traza que sale de acá dice
 * qué agentes se llamaron, no por qué en ese orden.
 */
export async function procesarTicketMal(ticket: { id: string; asunto: string; cuerpo: string }) {
  const r = query({
    prompt: `Resolvé el ticket ${ticket.id}: ${ticket.asunto}\n\n${ticket.cuerpo}\n\nUsá los subagentes que necesites, en el orden que te parezca.`,
    options: { agents: AGENTES as never },
  });
  for await (const m of r) {
    if (m.type === 'result') return m;
  }
}
