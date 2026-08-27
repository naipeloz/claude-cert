/**
 * DOMINIO 5 · Contexto y confiabilidad (15%)
 *
 * Pregunta de examen que responde este archivo:
 *   «¿Cómo sabés que el agente sigue funcionando después de tocarle el prompt?»
 *
 * Cuatro métricas, y la que importa es la de escalado. Acertar la categoría es fácil y
 * cualquier modelo lo hace; saber cuándo rendirse es lo que separa un demo de un sistema.
 * Un eval que solo mide aciertos premia al agente que siempre responde algo, que es
 * exactamente el que hay que evitar.
 *
 * Ver: decisions/D-07-reintentar-o-escalar.md
 */

import { readFileSync } from 'node:fs';
import { MODELO } from '../src/config.ts';
import { procesarTicket } from '../src/agents/orchestrator.ts';
import type { Fuente } from '../src/schemas/ticketInsight.ts';

type Caso = {
  id: string;
  ticket: { asunto: string; cuerpo: string };
  esperado: { categoria: string; requiere_humano: boolean; fuentes_esperadas: Fuente[] };
};

type Fila = {
  id: string;
  categoria: string;
  okCategoria: boolean;
  okEscalado: boolean;
  citas: number;
  fuentesOk: string;
  fallosDeSchema: number;
  regla: string;
  error?: string;
};

/**
 * Secuencial por defecto, y es una decisión medida, no precaución.
 *
 * Con tres casos en paralelo los límites de tasa empiezan a devolver errores de API y el
 * eval mide la infraestructura en vez del agente: en la misma versión del código, la tasa
 * de evidencia citada cayó de 80% a 30% y el escalado de 100% a 60%, sin que nada del
 * agente hubiera cambiado. Un eval más rápido que miente es peor que no tener eval.
 * EVAL_CONCURRENCIA=3 lo acelera, con esa advertencia.
 */
const CONCURRENCIA = Number(process.env.EVAL_CONCURRENCIA ?? 1);

const casos = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8')) as Caso[];
const filtro = process.argv.find((a) => a.startsWith('--case='))?.slice(7);
const aCorrer = filtro ? casos.filter((c) => c.id === filtro) : casos;

if (aCorrer.length === 0) {
  console.error(`No conozco el caso ${filtro}. Los disponibles son: ${casos.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

async function evaluar(c: Caso): Promise<Fila> {
  try {
    const { insight, fallosDeSchema, regla } = await procesarTicket({ id: c.id, ...c.ticket });
    const fuentes = new Set(insight.evidencia.map((e) => e.fuente));
    const cubiertas = c.esperado.fuentes_esperadas.filter((f) => fuentes.has(f)).length;
    return {
      id: c.id,
      categoria: insight.categoria,
      okCategoria: insight.categoria === c.esperado.categoria,
      okEscalado: insight.requiere_humano === c.esperado.requiere_humano,
      citas: insight.evidencia.length,
      fuentesOk: `${cubiertas}/${c.esperado.fuentes_esperadas.length}`,
      fallosDeSchema,
      regla,
    };
  } catch (e) {
    // Un caso que explota no invalida la corrida: se reporta y el resto sigue.
    return {
      id: c.id,
      categoria: '—',
      okCategoria: false,
      okEscalado: false,
      citas: 0,
      fuentesOk: '—',
      fallosDeSchema: 0,
      regla: '—',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const marca = (b: boolean) => (b ? '\x1b[32m ok \x1b[0m' : '\x1b[31mFALLA\x1b[0m');

console.log(`\nCorriendo ${aCorrer.length} caso(s) con ${MODELO}, de a ${CONCURRENCIA} (~45s cada uno)...\n`);

const filas: Fila[] = [];
const pendientes = [...aCorrer];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCIA, pendientes.length) }, async () => {
    for (let c = pendientes.shift(); c !== undefined; c = pendientes.shift()) {
      const fila = await evaluar(c);
      filas.push(fila);
      console.log(`  ${fila.error ? '\x1b[31mx\x1b[0m' : '\x1b[32m·\x1b[0m'} ${fila.id}`);
    }
  }),
);
filas.sort((a, b) => a.id.localeCompare(b.id));

console.log('\n  caso      categoría                 cat.   escalado  citas  fuentes  regla');
console.log('  ' + '─'.repeat(82));
for (const f of filas) {
  console.log(
    `  ${f.id}  ${f.categoria.padEnd(24)}  ${marca(f.okCategoria)}  ${marca(f.okEscalado)}   ` +
      `${String(f.citas).padStart(4)}   ${f.fuentesOk.padStart(6)}  ${f.regla}` +
      (f.error ? `\n            \x1b[31m${f.error}\x1b[0m` : ''),
  );
}

const n = filas.length;
const pct = (k: number) => `${((k / n) * 100).toFixed(0)}%`;
const conCitas = filas.filter((f) => f.citas > 0).length;
const escalados = filas.filter((f) => f.okEscalado).length;

console.log('\n  ' + '─'.repeat(82));
console.log(`  acierto de categoría      ${pct(filas.filter((f) => f.okCategoria).length)}`);
console.log(`  \x1b[1macierto de escalado       ${pct(escalados)}\x1b[0m   ← la métrica que importa`);
console.log(`  tasa de evidencia citada  ${pct(conCitas)}   (${conCitas}/${n} casos citaron al menos una fuente)`);
console.log(`  fallos de schema totales  ${filas.reduce((s, f) => s + f.fallosDeSchema, 0)}\n`);

// Un eval que no falla el proceso no sirve en CI.
if (escalados < n) process.exit(1);
