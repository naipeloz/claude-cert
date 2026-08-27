# D-03 · ¿Schema validado o parseo tolerante?

**Dominio:** Prompts y salida estructurada (20%)
**Archivos:** `src/schemas/ticketInsight.ts`, `src/prompts/compose.md`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

La salida del agente alimenta un dashboard de soporte: categoría, severidad, respuesta
sugerida y las citas que la respaldan. En producción, alrededor de un 4% de las respuestas
llegan con algo raro: un campo de más, `confianza` como `"85%"` en vez de `0.85`, o la
respuesta envuelta en un bloque de código. El dashboard ya tiene tres parches para esos
casos. Te piden que lo hagas confiable antes de conectarlo al flujo de tickets reales.

## Las opciones

- **A)** Parseo tolerante: normalizar lo que se pueda (sacar cercas, convertir `"85%"` a `0.85`, ignorar campos de más) y guardar lo que quedó.
- **B)** Schema estricto con Zod, y si no valida, devolverle al modelo los errores redactados para que corrija, con un tope de intentos.
- **C)** `outputFormat: { type: 'json_schema' }` del SDK, que restringe la generación al schema y garantiza que lo que vuelve valide.
- **D)** Pedirle el JSON a un segundo modelo más chico que reciba la respuesta en prosa del primero y la estructure.

## Elegida: B

Dos razones, y la segunda es la que decide.

La primera es que el schema es **una sola fuente de verdad**: `schemaParaPrompt()` deriva
del mismo Zod que valida, así que el prompt y la validación no se pueden desincronizar.

La segunda es que el schema no solo verifica la forma, **sostiene una regla de negocio**:
ninguna conclusión sale sin al menos una cita. Esa regla necesita un camino de reintento
con un mensaje que le diga al modelo qué hacer —"si no encontraste ninguna, marcá
`requiere_humano: true`"— y necesita que la única salida sea admitir que no hay respuesta.
Un mecanismo que solo garantiza la forma no puede expresar eso.

## Por qué fallan las otras

- **A)** Funciona hasta que el modelo se equivoca en algo que no se puede normalizar. `"85%"` se arregla; una cita inventada, no. Y cada normalización que agregás le enseña al sistema a aceptar salidas peores: al año tenés una capa de compatibilidad que nadie entiende y ningún dato sobre qué tan seguido el modelo falla, porque los fallos se arreglan solos y en silencio.
- **C)** Es la más difícil de descartar, porque es real y elimina de raíz los errores de forma — mejor que B en eso. Lo que perdés es el bucle: cuando la salida no valida, el error que ve el modelo lo genera el motor de restricción, no vos, y ahí es donde vive el mensaje que enseña qué hacer cuando no hay evidencia. El repo lo usa como referencia y no como implementación, precisamente porque lo que se demuestra acá es el criterio del error redactado ([D-04](D-04-errores-para-el-modelo.md)). En un sistema donde solo importa la forma, C es la respuesta correcta.
- **D)** Agrega una llamada, una latencia y un modelo más que mantener, para resolver un problema que el primer modelo puede resolver solo. Peor: el segundo modelo no vio las fuentes, así que cuando el primero fue vago —"según la documentación, esto ya está corregido"— el segundo tiene que inventar el id de la cita para llenar el campo. Estructurar prosa ambigua produce datos estructurados y falsos, que son peores que datos que no validan.

## La trampa

Pensar que el problema es **el formato**. El formato es el síntoma visible y el más fácil de
arreglar; por eso A y C se sienten suficientes. El problema real es **qué pasa cuando el
modelo no tiene con qué responder**, y ahí el formato correcto es justamente lo que oculta
el fallo: un JSON impecable con una cita inventada valida contra cualquier schema.
