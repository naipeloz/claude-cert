/**
 * DOMINIO 1 · Diseño de agentes (27%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Qué le mostrás a un operador para que pueda confiar en lo que hizo el agente?»
 *
 * La traza primero, el JSON después. Un agente que solo imprime el resultado obliga a
 * confiar; imprimir los cinco pasos con lo que pasó en cada uno hace que el resultado sea
 * verificable. Es también lo que se recorre en vivo en la demo.
 *
 * Ver: decisions/D-01-buscador-tool-o-subagente.md
 */

import { readFileSync } from 'node:fs';
import { MODELO, MODELO_CLASIFICADOR } from './config.ts';
import { procesarTicket, type Ticket } from './agents/orchestrator.ts';

type Caso = { id: string; ticket: { asunto: string; cuerpo: string } };

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

function resolverTicket(): Ticket {
  const asunto = arg('asunto');
  const cuerpo = arg('cuerpo');
  if (asunto && cuerpo) return { id: arg('ticket') ?? 'TCK-9999', asunto, cuerpo };

  const id = arg('ticket');
  const casos = JSON.parse(readFileSync(new URL('../evals/cases.json', import.meta.url), 'utf8')) as Caso[];
  if (!id) {
    console.error(
      `Falta --ticket. Los tickets disponibles son:\n  ${casos.map((c) => `${c.id}  ${c.ticket.asunto}`).join('\n  ')}\n\n` +
        `También podés pasar uno propio: npm run demo -- --asunto="..." --cuerpo="..."`,
    );
    process.exit(1);
  }
  const caso = casos.find((c) => c.id === id);
  if (!caso) {
    console.error(`No conozco el ticket ${id}. Los disponibles son: ${casos.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  return { id: caso.id, ...caso.ticket };
}

const t = resolverTicket();
console.log(`\n\x1b[1m${t.id} · ${t.asunto}\x1b[0m`);
console.log(`\x1b[2m${t.cuerpo}\x1b[0m`);
console.log(`\x1b[2mmodelo: ${MODELO} · clasificador: ${MODELO_CLASIFICADOR}\x1b[0m\n`);

const inicio = Date.now();
const { insight, traza } = await procesarTicket(t);

console.log('\x1b[1mTraza\x1b[0m');
for (const [i, p] of traza.entries()) {
  console.log(`  ${i + 1}. \x1b[36m${p.paso.padEnd(16)}\x1b[0m ${p.detalle}`);
}
console.log(`\x1b[2m  (${((Date.now() - inicio) / 1000).toFixed(1)}s)\x1b[0m\n`);

console.log('\x1b[1mInsight\x1b[0m');
console.log(JSON.stringify(insight, null, 2));
