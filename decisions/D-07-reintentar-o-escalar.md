# D-07 · ¿Reintentar o escalar, y en qué orden se evalúan las reglas?

**Dominio:** Contexto y confiabilidad (15%)
**Archivos:** `src/context/policy.ts`, `src/agents/orchestrator.ts`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

El agente responde bien la mayoría de los tickets. Los casos que fallan son de tres tipos:
el modelo devuelve un JSON que no valida, una de las tres fuentes no responde, o el ticket
no está cubierto por ninguna fuente. Además, negocio te pide algo que suena aparte: si el
cliente menciona darse de baja, el ticket tiene que ir a una persona. Estás decidiendo cómo
se combinan estas condiciones.

## Las opciones

- **A)** Un puntaje de confianza compuesto que pondere las señales, y escalar si queda por debajo de un umbral.
- **B)** Reglas ordenadas de más grave a menos, la primera que dispara gana, y la de cancelación primera de todas.
- **C)** Reintentar todo hasta agotar intentos y escalar solo lo que quede fallando, para maximizar la tasa de resolución automática.
- **D)** Que el modelo decida si escala, pasándole las señales en el prompt y dejándolo poner `requiere_humano`.

## Elegida: B

Dos cosas separadas, y las dos importan.

**Reintentar y escalar responden a preguntas distintas.** Se reintenta lo que puede salir
distinto la próxima vez: un timeout, un JSON mal formado. No se reintenta lo que ya se sabe
—que ninguna fuente cubre el caso— porque el segundo intento va a encontrar lo mismo que el
primero, con más latencia.

**Y el orden de las reglas es la decisión, no las reglas.** Un cliente que menciona cancelar
va a una persona aunque el agente esté segurísimo de la respuesta técnica: acertar el
diagnóstico y perder la cuenta sigue siendo perder la cuenta. Por eso esa regla está
primera. Y la confianza del modelo —que un diseño ingenuo pondría arriba de todo— está
última, porque es la señal más débil de la lista: es la opinión del modelo sobre sí mismo.

## Por qué fallan las otras

- **A)** Es la que más se parece a lo que uno haría con un clasificador, y el problema es que promedia cosas que no se promedian. Con pesos, una confianza muy alta compensa una mención de cancelación y el ticket no escala — el caso exacto que negocio pidió cubrir. Además nadie puede responder "¿por qué escaló este ticket?" mirando un número: los pesos se vuelven un lugar donde se esconden decisiones de producto.
- **C)** Optimiza la métrica que se ve —tasa de resolución automática— empujando el costo a donde no se mide: el cliente recibe una respuesta inventada en vez de esperar veinte minutos por una correcta. Y reintentar lo irreintentable no cambia el resultado, solo lo demora: tres intentos contra una fuente que no cubre el tema son tres veces el mismo "no hay nada".
- **D)** Es tentadora porque el modelo tiene todo el contexto del ticket. Le pide a la parte del sistema que puede equivocarse que decida cuándo se equivocó. Un modelo que alucinó una respuesta no tiene forma de saber que alucinó, así que va a reportar confianza alta justo en el caso en que más importa escalar. La opinión del modelo entra como **una** señal de seis, no como el juez.

## La trampa

Ver la mención de cancelación como **una regla de negocio aparte**, que se resuelve con un
`if` en otro lado. Es la regla de escalado de mayor prioridad del sistema, y ponerla en el
orden correcto es lo que hace que el resto funcione. Cuando las reglas están ordenadas y la
primera que dispara gana, "¿por qué escaló este ticket?" tiene una respuesta de una línea
—`riesgo-de-cancelacion`— y esa auditabilidad es la mitad del valor.
