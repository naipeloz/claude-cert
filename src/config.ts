/**
 * DOMINIO 2 · Claude Code a nivel equipo (20%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Dónde vive la configuración que cambia entre entornos y personas?»
 *
 * Un solo lugar con nombres de modelo en todo el repo. Los nombres de modelo caducan
 * y este repo tiene que sobrevivir a la charla: si mañana sale otro modelo, se cambia
 * una variable de entorno, no ocho archivos. Los umbrales de negocio NO viven acá:
 * viven en src/context/policy.ts, que es una política auditable, no configuración.
 *
 * Ver: decisions/D-02-jerarquia-claude-md.md
 */

import { existsSync } from 'node:fs';

// Carga .env sin dependencias: process.loadEnvFile es nativo desde Node 20.12.
// Si la variable ya está en el entorno, el archivo no la pisa.
if (existsSync('.env')) process.loadEnvFile('.env');

/**
 * Modelo principal: investigar y redactar. Son los dos pasos donde el criterio
 * del modelo cambia el resultado que ve el cliente.
 */
export const MODELO = process.env.CLAUDE_MODEL ?? 'claude-opus-5';

/**
 * Modelo del clasificador. Elegir modelo por rol es parte del diseño del agente,
 * no una optimización posterior: clasificar es una pasada sobre un texto corto con
 * cinco categorías y tres ejemplos. Pagar el modelo grande ahí es gasto sin retorno.
 */
export const MODELO_CLASIFICADOR = process.env.CLAUDE_MODEL_CLASIFICADOR ?? 'claude-haiku-4-5';

/**
 * Nombre del servidor MCP in-process. El SDK expone sus tools al modelo como
 * `mcp__<nombre>__<tool>`, así que este string aparece en los allowedTools de los
 * subagentes. Vive acá para que no haya dos literales que se puedan desincronizar.
 */
export const MCP_SOPORTE = 'soporte';

/** Nombre calificado de una tool del servidor, tal como lo ve el modelo. */
export const toolMcp = (nombre: string) => `mcp__${MCP_SOPORTE}__${nombre}`;
