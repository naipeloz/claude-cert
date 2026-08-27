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
formularse. Cuando no hay dependencia, secuencial es latencia pura. Una sola instrucción en
el prompt —"empezá siempre llamando a las tres en el mismo turno, en paralelo"— baja el paso
de un minuto y medio a una fracción.

La segunda mitad de la decisión es igual de importante: **después del fan-out, como mucho
una ronda más**. Sin ese tope, un modelo que no encuentra lo que busca sigue reformulando, y
el ahorro de latencia se lo come el bucle.

## Por qué fallan las otras

- **A)** Es lo que ya tenías y produjo el síntoma. El modelo puede llamar tools en paralelo, pero por defecto tiende a hacerlo de a una porque cada resultado parece informar la consulta siguiente. Que sea capaz no significa que lo haga: hay que pedirlo.
- **C)** Suena a la optimización obvia y es la que rompe el caso principal. El ticket típico dice "el PDF me corta la tabla", que en la base de conocimiento parece una consulta de uso y solo el changelog revela que es un defecto ya corregido. Condicionar el changelog a que la KB "sugiera" un defecto significa consultarlo justo cuando ya no hace falta. Además ahorra una llamada a tres arrays en memoria: optimiza lo que no cuesta.
- **D)** Consigue el mismo paralelismo por un precio mucho más alto —tres arranques, tres prompts, tres ventanas— y pierde algo que B tiene gratis: en B los tres resultados llegan al mismo contexto, así que el investigador puede notar que la resolución del ticket previo quedó desactualizada por una entrada del changelog. Con tres subagentes aislados, esa contradicción no la ve nadie. Ver también [D-01](D-01-buscador-tool-o-subagente.md).

## La trampa

Tratar el paralelismo como **una propiedad de la infraestructura** en vez de como **algo que
se pide en el prompt**. El SDK ya soporta varias llamadas a tools en un mismo turno; lo que
faltaba no era una capacidad sino una instrucción. Y el criterio para pedirlo es concreto y
se puede aplicar a cualquier fan-out: **¿alguna de estas consultas necesita el resultado de
otra para poder formularse?** Si la respuesta es no, van juntas.
