# Agentes

## Cuándo algo merece ser un subagente

Un subagente se justifica por **contexto** o por **rol**. Si no entra en ninguna de las dos,
es un paso de código o una tool.

- **Por contexto** — la tarea lee mucho más de lo que devuelve. El subagente existe para
  que el material descartado muera con él. `investigador` lee diez documentos y vuelve con
  cuatro citas.
- **Por rol** — la tarea tiene un criterio propio y un prompt que no se parece al de las
  otras. `redactor` escribe para un cliente enojado; mezclarlo con investigar da un agente
  que hace las dos cosas a medias.

Lo que **no** justifica un subagente: que la tarea sea "un paso distinto" (eso es una
función), que se vea más ordenado en un diagrama, o que use una tool distinta (eso es una
tool distinta). Clasificar el ticket es el caso de manual: es una pasada sobre un texto
corto, no hay contexto que aislar ni rol que sostener, y va como llamada suelta sin agente.

## Tope: dos subagentes

Hay exactamente dos y no se agrega un tercero sin borrar uno. No es una regla estética: cada
subagente suma una ventana de contexto que mantener, un prompt que se desincroniza del
resto, latencia de arranque, y un modo de falla nuevo. El repo tiene que demostrar
contención, no capacidad — agregar agentes es lo fácil.

Si aparece un candidato nuevo, la pregunta es cuál de los dos actuales absorbe la tarea.

## El orden lo decide el código

El orquestador es lineal y explícito. Un agente suelto con todas las tools también resuelve
el ticket, y elige un camino distinto en cada corrida: no se puede depurar, ni medir, ni
mostrar en vivo. El modelo decide qué decir en cada paso; el código decide qué pasos hay.

## Traza obligatoria

**Todo paso que agregues registra en la `traza`.** Un paso que no deja rastro no existe para
quien opera el sistema, y es exactamente el que va a fallar en silencio. El detalle lleva
números concretos —cuántas citas, cuántos KB, qué regla disparó— y no adjetivos.

## settingSources: []

Toda llamada al modelo lo fija explícitamente. Sin eso, el agente de soporte cargaría los
`CLAUDE.md` de este repo, que son instrucciones para quien programa acá y no contexto del
producto. Es el error más fácil de cometer y el que peor se ve en una demo.
