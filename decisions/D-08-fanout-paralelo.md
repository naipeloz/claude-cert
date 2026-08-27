# D-08 · ¿Fan-out paralelo o investigación secuencial?

**Dominio:** Diseño de agentes (27%)
**Archivos:** `src/agents/subagents.ts`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

El subagente `investigador` tiene tres tools sobre tres fuentes. Con el prompt inicial, el
modelo las llamaba de a una: buscaba en la base de conocimiento, leía el resultado, después
consultaba el changelog, leía, y recién ahí los tickets previos. Cada ticket tardaba cerca
de un minuto y medio en el paso de investigación. En la demo eso es una eternidad.

## Las opciones

- **A)** Dejar que el modelo decida el orden y la cantidad de consultas, sin instrucción al respecto.
- **B)** Instruir al subagente a llamar las tres tools en el mismo turno, en paralelo, y recién después decidir si hace una segunda ronda.
- **C)** Consultar primero la base de conocimiento y solo consultar el changelog si el resultado sugiere que puede ser un defecto, para ahorrar llamadas.
- **D)** Tres subagentes en paralelo, uno por fuente, cada uno con su tool.

## Elegida: B

Las tres consultas **no dependen entre sí**: ninguna necesita el resultado de otra para
formularse. Cuando no hay dependencia, secuencial es latencia pura. Así que el prompt del
`investigador` pide explícitamente las tres en el mismo turno.

La segunda mitad de la decisión es igual de importante: **después del fan-out, como mucho
una ronda más**. Sin ese tope, un modelo que no encuentra lo que busca sigue reformulando, y
el ahorro de latencia se lo come el bucle.

## Lo que pasó cuando lo medimos

Esta es la parte que hace que valga la pena leer esta decisión y no solo la de arriba.

**Pedirlo en el prompt no alcanzó.** Con el prompt tal como está, el `investigador` llama a
las tres tools de a una, esperando cada resultado. La traza lo dice en cada corrida:

```
2. investigado       3 llamadas en 3 turno(s) → secuencial → 4 citas
```

Se probaron tres refuerzos y ninguno lo corrigió del todo:

| Variante | Resultado |
|---|---|
| Prompt actual | secuencial: `llamada → resultado → llamada → resultado → llamada → resultado` |
| Prompt + regla de forma explícita ("las tres juntas ANTES de leer ningún resultado") | secuencial |
| Lo anterior + `effort: 'low'` en la `AgentDefinition` | **parcial**: la 1ª sola, la 2ª y 3ª juntas |
| Lo anterior con `claude-sonnet-5` | secuencial |

Que `effort: 'low'` produzca un batch parcial confirma que el paralelismo es alcanzable, y
que lo que lo bloquea es la tendencia del modelo a mirar el primer resultado antes de
decidir la consulta siguiente — que es razonable, y es justo lo que acá no hace falta.

**Por qué la decisión sigue siendo B.** El escenario habla de un minuto y medio de latencia;
en este repo las tres fuentes son arrays en memoria y el fan-out secuencial cuesta unos
segundos, así que la latencia no justifica cambiar de diseño. B sigue siendo correcta como
criterio —cuando las consultas no dependen entre sí, van juntas— y lo que falla es el
mecanismo para conseguirlo, no la decisión.

**Qué haríamos si la latencia importara de verdad**, en orden de costo: bajar el `effort` del
investigador y medir de nuevo; si no alcanza, sacar el fan-out del modelo y hacerlo en código
—tres llamadas a las tools desde el orquestador, con las consultas derivadas del ticket— a
costa de perder la reformulación, que es justamente lo que [D-06](D-06-mcp-in-process.md)
descarta en su opción D.

**Y la lección que se lleva el repo:** una afirmación sobre el comportamiento del modelo que
no se mide es una suposición. Por eso la forma del fan-out se imprime en la traza de cada
corrida, y no en un comentario.

## Por qué fallan las otras

- **A)** Es lo que ya tenías y produjo el síntoma. El modelo puede llamar tools en paralelo, pero por defecto tiende a hacerlo de a una porque cada resultado parece informar la consulta siguiente. Que sea capaz no significa que lo haga: hay que pedirlo — y, como muestra la medición de abajo, pedirlo tampoco garantiza que lo haga.
- **C)** Suena a la optimización obvia y es la que rompe el caso principal. El ticket típico dice "el PDF me corta la tabla", que en la base de conocimiento parece una consulta de uso y solo el changelog revela que es un defecto ya corregido. Condicionar el changelog a que la KB "sugiera" un defecto significa consultarlo justo cuando ya no hace falta. Además ahorra una llamada a tres arrays en memoria: optimiza lo que no cuesta.
- **D)** Consigue el mismo paralelismo por un precio mucho más alto —tres arranques, tres prompts, tres ventanas— y pierde algo que B tiene gratis: en B los tres resultados llegan al mismo contexto, así que el investigador puede notar que la resolución del ticket previo quedó desactualizada por una entrada del changelog. Con tres subagentes aislados, esa contradicción no la ve nadie. Ver también [D-01](D-01-buscador-tool-o-subagente.md).

## La trampa

Son dos, y la segunda solo aparece cuando medís.

La primera es tratar el paralelismo como **una propiedad de la infraestructura** en vez de
como algo que se pide. El SDK soporta varias llamadas a tools en un mismo turno; lo que
falta no es una capacidad sino una instrucción. El criterio para pedirlo se aplica a
cualquier fan-out: **¿alguna de estas consultas necesita el resultado de otra para poder
formularse?** Si la respuesta es no, van juntas.

La segunda es **dar por hecho que pedirlo alcanzó**. Un prompt que pide un comportamiento y
un comentario que dice que lo consiguió se leen exactamente igual, tenga razón o no. Acá no
la tenía, y nadie lo habría notado sin mirar el orden real de los mensajes: la respuesta al
cliente sale bien igual, solo tarda de más. Los fallos de diseño de agentes que sobreviven
son los que no cambian la salida.
