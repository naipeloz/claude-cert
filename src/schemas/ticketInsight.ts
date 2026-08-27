/**
 * DOMINIO 3 · Prompts y salida estructurada (20%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Cómo garantizás que la salida del modelo sea utilizable por el sistema que la consume?»
 *
 * El contrato. Todo lo demás depende de este archivo. Dos criterios que se leen acá:
 * el schema es la única fuente de verdad (el prompt se deriva de él, no se escribe a mano),
 * y los errores de validación se redactan PARA EL MODELO, no para un humano que lee logs.
 *
 * Ver: decisions/D-03-schema-validado.md
 */

import { z } from 'zod';

export const Categoria = z.enum([
  'facturacion',
  'acceso_cuenta',
  'bug_producto',
  'solicitud_funcionalidad',
  'otro',
]);
export type Categoria = z.infer<typeof Categoria>;

export const Severidad = z.enum(['baja', 'media', 'alta', 'critica']);
export type Severidad = z.infer<typeof Severidad>;

export const Fuente = z.enum(['kb', 'changelog', 'tickets_previos']);
export type Fuente = z.infer<typeof Fuente>;

export const Evidencia = z.object({
  fuente: Fuente,
  id: z.string().min(1),
  // Máximo 400: una cita más larga que esto ya es "pegué el documento entero".
  cita: z.string().min(1).max(400),
});
export type Evidencia = z.infer<typeof Evidencia>;

const Campos = z.object({
  ticket_id: z.string().min(1),
  categoria: Categoria,
  severidad: Severidad,
  confianza: z.number().min(0).max(1),
  resumen: z.string().min(1).max(280),
  respuesta_sugerida: z.string().min(1),

  /**
   * El mínimo de una cita es la decisión de diseño más importante de todo el schema.
   *
   * "Citá siempre la fuente" en el prompt es una sugerencia: el modelo la cumple casi
   * siempre y falla justo cuando no encontró nada, que es cuando más importa. Acá deja
   * de ser una sugerencia y pasa a ser algo que el sistema no puede saltarse.
   */
  evidencia: z.array(Evidencia).max(6),

  requiere_humano: z.boolean(),
  motivo_escalado: z.string().nullable(),
});

/**
 * La regla del mínimo de una cita, con su única salida.
 *
 * Está como refinación y no como .min(1) en el array a propósito: la regla real no es
 * "siempre hay una cita", es "ninguna CONCLUSIÓN va sin cita". Un escalado no es una
 * conclusión, es admitir que no la hay. Si fuera .min(1) a secas, el sistema no tendría
 * forma de expresar "no encontré nada" y el modelo quedaría obligado a inventar una cita
 * para poder validar — que es exactamente el fallo que la regla quería evitar.
 *
 * El mensaje es el que lee el modelo cuando falla, y le dice la salida: marcar
 * requiere_humano. Rendirse bien es parte del contrato, no un caso de error.
 */
export const TicketInsight = Campos.superRefine((v, ctx) => {
  if (v.evidencia.length === 0 && !v.requiere_humano) {
    ctx.addIssue({
      code: 'custom',
      path: ['evidencia'],
      message: 'evidencia vacía',
    });
  }
  if (v.requiere_humano && !v.motivo_escalado) {
    ctx.addIssue({ code: 'custom', path: ['motivo_escalado'], message: 'falta el motivo' });
  }
});
export type TicketInsight = z.infer<typeof TicketInsight>;

/**
 * El schema en JSON, para inyectar en el prompt con {{SCHEMA}}.
 *
 * Se deriva del zod a mano en veinte líneas en vez de sumar zod-to-json-schema: la
 * dependencia haría exactamente esto y una dependencia se actualiza sola, un archivo no.
 * Lo que importa es que hay UNA fuente de verdad: si cambia el zod de arriba, cambia el
 * prompt. No existe el estado donde el schema pide un campo y el prompt pide otro.
 */
export function schemaParaPrompt(): string {
  return JSON.stringify(
    {
      ticket_id: 'string — el id del ticket, tal cual te lo pasamos',
      categoria: Categoria.options,
      severidad: Severidad.options,
      confianza: 'number entre 0 y 1',
      resumen: 'string, máximo 280 caracteres',
      respuesta_sugerida: 'string — el texto que se le envía al cliente',
      evidencia: [
        {
          fuente: Fuente.options,
          id: 'string — el id exacto que devolvió la tool, por ejemplo KB-014 o v4.2.1',
          cita: 'string, máximo 400 caracteres, copiada literal de la fuente',
        },
      ],
      requiere_humano: 'boolean',
      motivo_escalado: 'string o null — obligatorio si requiere_humano es true',
    },
    null,
    2,
  );
}

/**
 * Saca el objeto JSON de una respuesta que puede venir con prosa o con cercas alrededor.
 *
 * Vive con el contrato y no con el orquestador a propósito: extraer y validar son las dos
 * mitades de la misma pregunta —cuánta tolerancia le das a la salida del modelo— y la
 * respuesta de este repo es: tolerancia en la FORMA (cercas, prosa alrededor), cero
 * tolerancia en el CONTENIDO (eso lo decide validar()). Mezclar las dos es lo que produce
 * el parseo indulgente que después deja pasar un insight sin evidencia.
 *
 * Cuenta llaves en vez de ir del primer "{" al último "}": el modelo a veces devuelve el
 * objeto y después un comentario con otro objeto de ejemplo, y agarrar de punta a punta
 * junta los dos en algo que no parsea. Se toma el primer objeto balanceado y listo.
 * Las llaves dentro de strings no cuentan, que es de donde salen los falsos positivos.
 */
export function extraerJson(texto: string): unknown {
  const limpio = texto.replace(/```(?:json)?/g, '');
  const i = limpio.indexOf('{');
  if (i === -1) throw new Error('la respuesta no contiene un objeto JSON');

  let nivel = 0;
  let enString = false;
  let escapado = false;
  for (let k = i; k < limpio.length; k++) {
    const c = limpio[k];
    if (escapado) { escapado = false; continue; }
    if (c === '\\') { escapado = true; continue; }
    if (c === '"') { enString = !enString; continue; }
    if (enString) continue;
    if (c === '{') nivel++;
    else if (c === '}' && --nivel === 0) return JSON.parse(limpio.slice(i, k + 1));
  }
  throw new Error('la respuesta tiene un objeto JSON sin cerrar');
}

export type ResultadoValidacion =
  | { ok: true; valor: TicketInsight }
  | { ok: false; errores: string[]; reintentable: boolean };

/**
 * Mensajes de error escritos para el modelo: qué pasó, por qué importa y qué hacer ahora.
 *
 * "Array must contain at least 1 element(s)" es correcto y es inútil: no dice qué array,
 * no dice por qué, y sobre todo no dice qué hacer si de verdad no hay nada que citar.
 * Un error que el modelo no puede accionar garantiza que el reintento falle igual.
 */
const MENSAJES: Record<string, string> = {
  evidencia:
    'Toda conclusión necesita al menos una cita. Si no encontraste ninguna, marca requiere_humano: true',
  'evidencia.cita':
    'Las citas van copiadas literales de la fuente y no pasan de 400 caracteres. Recorta al fragmento que sostiene tu conclusión, no pegues el documento entero.',
  'evidencia.id':
    'Cada cita necesita el id exacto que devolvió la tool (por ejemplo KB-014, v4.2.1 o TCK-0803). No inventes ids ni uses el título del artículo.',
  resumen:
    'El resumen entra en 280 caracteres: es una línea para un dashboard, no la respuesta al cliente. La respuesta larga va en respuesta_sugerida.',
  confianza:
    'confianza es un número entre 0 y 1 (por ejemplo 0.82), no un porcentaje ni un texto.',
  categoria: `categoria tiene que ser exactamente una de: ${Categoria.options.join(', ')}. Si ninguna encaja, usa "otro".`,
  severidad: `severidad tiene que ser exactamente una de: ${Severidad.options.join(', ')}.`,
  motivo_escalado:
    'motivo_escalado es un string cuando requiere_humano es true, y null cuando es false. No lo omitas.',
};

function mensajeAccionable(ruta: string, fallback: string): string {
  // La ruta llega como "evidencia.0.cita"; los índices no aportan al mensaje.
  const clave = ruta.replace(/\.\d+/g, '');
  return MENSAJES[clave] ?? `Campo "${ruta || 'raíz'}": ${fallback}`;
}

/**
 * Valida la salida del modelo. Nunca lanza: devolver el fallo es parte del contrato,
 * porque quien llama tiene que poder reintentar pasándole los errores al modelo.
 *
 * `reintentable: false` significa "no es un problema de forma, es que no hay respuesta":
 * reintentar solo quema tokens. Ese caso va derecho a escalado humano.
 */
export function validar(bruto: unknown): ResultadoValidacion {
  const r = TicketInsight.safeParse(bruto);
  if (r.success) return { ok: true, valor: r.data };

  const errores = r.error.issues.map((i) => mensajeAccionable(i.path.join('.'), i.message));

  /**
   * Reintentar tiene sentido mientras el modelo esté intentando responder. Si ya marcó
   * requiere_humano, se rindió: corregirle el formato es discutir con alguien que ya dijo
   * "esto va a una persona". El orquestador toma esa señal y escala en vez de gastar otro
   * turno. Es la misma pregunta que decide D-07: reintentar o escalar, y en qué orden.
   */
  const yaSeRindio =
    typeof bruto === 'object' &&
    bruto !== null &&
    (bruto as Record<string, unknown>).requiere_humano === true;

  return { ok: false, errores: [...new Set(errores)], reintentable: !yaSeRindio };
}
