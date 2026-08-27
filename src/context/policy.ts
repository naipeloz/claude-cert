/**
 * DOMINIO 5 · Contexto y confiabilidad (15%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «Cuando el contexto no alcanza y las cosas fallan, ¿qué se tira y cuándo se rinde el agente?»
 *
 * Toda la política del sistema en un archivo, para que se pueda auditar de un vistazo.
 * Si estos umbrales estuvieran repartidos como números sueltos dentro del orquestador,
 * nadie podría responder "¿cuándo escala este agente?" sin leer el orquestador entero.
 *
 * Ver: decisions/D-05-compactar-por-rol.md · decisions/D-07-reintentar-o-escalar.md
 */

import type { Evidencia, Severidad } from '../schemas/ticketInsight.ts';

/**
 * Los umbrales del sistema. Nombrados y exportados: la política es una decisión de
 * producto, no un detalle de implementación, y cambiarla tiene que ser una línea visible
 * en un diff, no un número enterrado en un if.
 */
export const UMBRALES = {
  /** Debajo de esto, la respuesta del agente no se le manda al cliente sin que la mire alguien. */
  confianzaMinima: 0.65,
  /** Ninguna conclusión sale sin al menos una cita. La regla vive también en el schema. */
  minEvidencia: 1,
  /** Fallos de schema tolerados antes de dejar de reintentar y escalar. */
  maxFallosDeSchema: 2,
  /** Reintentos por llamada al modelo ante fallos transitorios. */
  maxReintentos: 2,
  /** Espera base del backoff, en milisegundos. */
  backoffBaseMs: 400,
} as const;

/** Lo que el orquestador acumula mientras trabaja. */
export type EstadoTicket = {
  /** Todo lo que devolvieron las tools, literal. Es lo que crece sin límite. */
  materialBruto: string[];
  /** Las citas que el investigador rescató. Es lo único que no se puede reconstruir. */
  evidencia: Evidencia[];
};

export type ResultadoCompactacion = {
  estado: EstadoTicket;
  bytesDescartados: number;
  citasConservadas: number;
};

/**
 * Compacta por ROL del dato, no por antigüedad.
 *
 * El error clásico es compactar por antigüedad: "resumí los primeros N mensajes". Suena
 * razonable y pierde exactamente lo que no se puede recuperar, porque el material más
 * viejo es el resultado de las búsquedas, o sea las citas. Lo nuevo (el razonamiento del
 * modelo) se vuelve a generar gratis; una cita perdida obliga a volver a buscar, y si la
 * búsqueda ya no la devuelve, el sistema termina afirmando cosas sin fuente.
 *
 * Acá el criterio es el opuesto y es explícito: la evidencia citada se conserva entera y
 * el material bruto se descarta entero. No hay resumen intermedio: resumir el material
 * bruto sería inventar una tercera versión de la verdad que nadie puede auditar.
 */
export function compactar(estado: EstadoTicket): ResultadoCompactacion {
  const bytesDescartados = estado.materialBruto.reduce((n, m) => n + Buffer.byteLength(m, 'utf8'), 0);
  return {
    estado: { materialBruto: [], evidencia: estado.evidencia },
    bytesDescartados,
    citasConservadas: estado.evidencia.length,
  };
}

export type SenalesEscalado = {
  confianza: number;
  severidad: Severidad;
  cantidadEvidencia: number;
  fallosDeSchema: number;
  toolsCaidas: number;
  clienteMencionaCancelar: boolean;
};

export type DecisionEscalado = { requiereHumano: boolean; motivo: string | null; regla: string };

/**
 * Reglas ordenadas de más grave a menos: la primera que dispara gana.
 *
 * El orden es la decisión, no las reglas. Un cliente que menciona cancelar va a una
 * persona aunque el agente esté segurísimo de la respuesta técnica: acertar el diagnóstico
 * y perder la cuenta sigue siendo perder la cuenta. Por eso esa regla está primera y no
 * última, y por eso la confianza del modelo — que es lo que un diseño ingenuo pondría
 * arriba de todo — está al final: es la señal más débil de la lista.
 */
export function decidirEscalado(s: SenalesEscalado): DecisionEscalado {
  const reglas: Array<[boolean, string, string]> = [
    [
      s.clienteMencionaCancelar,
      'riesgo-de-cancelacion',
      'El cliente menciona cancelar o dar de baja. Va a una persona aunque la respuesta técnica sea clara.',
    ],
    [
      s.severidad === 'critica',
      'severidad-critica',
      'Severidad crítica: pérdida de datos o servicio caído. No se responde sin revisión humana.',
    ],
    [
      s.toolsCaidas > 0,
      'fuentes-incompletas',
      `${s.toolsCaidas} fuente(s) no respondieron: la investigación está incompleta y las conclusiones no son confiables.`,
    ],
    [
      s.fallosDeSchema >= UMBRALES.maxFallosDeSchema,
      'salida-no-valida',
      `El modelo no produjo una salida válida en ${s.fallosDeSchema} intentos.`,
    ],
    [
      s.cantidadEvidencia < UMBRALES.minEvidencia,
      'sin-evidencia',
      'Ninguna fuente cubre el caso. Responder sin evidencia es inventar.',
    ],
    [
      s.confianza < UMBRALES.confianzaMinima,
      'confianza-baja',
      `Confianza ${s.confianza.toFixed(2)}, por debajo del umbral ${UMBRALES.confianzaMinima}.`,
    ],
  ];

  for (const [dispara, regla, motivo] of reglas) {
    if (dispara) return { requiereHumano: true, motivo, regla };
  }
  return { requiereHumano: false, motivo: null, regla: 'automatico' };
}

/**
 * Reintento con backoff acotado para fallos transitorios del modelo o de la red.
 *
 * Acotado a propósito: un backoff exponencial sin techo convierte un incidente de cinco
 * minutos en una demo colgada. Cuando se agotan los intentos, la excepción sube y el
 * orquestador la traduce en una señal de escalado — que es la respuesta correcta a
 * "no pude averiguarlo", y no un reintento número quince.
 */
export async function conReintento<T>(
  fn: () => Promise<T>,
  intentos: number,
  etiqueta: string,
): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (i < intentos - 1) {
        await new Promise((r) => setTimeout(r, UMBRALES.backoffBaseMs * 2 ** i));
      }
    }
  }
  const detalle = ultimo instanceof Error ? ultimo.message : String(ultimo);
  throw new Error(`${etiqueta} falló tras ${intentos} intentos: ${detalle}`);
}
