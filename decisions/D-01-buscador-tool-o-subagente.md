# D-01 · ¿El buscador es una tool o un subagente?

**Dominio:** Diseño de agentes (27%)
**Archivos:** `src/agents/subagents.ts`, `src/agents/orchestrator.ts`

## El escenario

Tu agente de soporte tiene que consultar tres fuentes antes de responder: la base de
conocimiento, el changelog de releases y los tickets ya resueltos. Una consulta típica
devuelve entre seis y diez documentos, de los cuales terminan sirviendo tres o cuatro. El
agente después tiene que redactar una respuesta para el cliente con esas citas. En las
pruebas notás que cuando el ticket es complejo la respuesta final se degrada: menciona
artículos que no venían al caso y a veces mezcla dos versiones del producto.

## Las opciones

- **A)** Darle las tres tools al agente principal y dejar que busque y redacte en el mismo hilo, con un prompt que le pida descartar lo irrelevante antes de escribir.
- **B)** Un subagente `investigador` con las tres tools que devuelve solo las citas, y el hilo principal redacta con eso.
- **C)** Una sola tool `investigar(consulta)` que por dentro consulta las tres fuentes y devuelve un resumen ya filtrado.
- **D)** Tres subagentes, uno por fuente, cada uno con su tool, que corren en paralelo y devuelven sus citas.

## Elegida: B

El problema no es que el agente busque mal: es que **lee mucho más de lo que usa**, y todo
lo que lee se queda en la ventana. Cuando llega a redactar, el material descartado sigue
ahí compitiendo por atención con las cuatro citas que importan. Un subagente resuelve
exactamente eso: el material bruto entra en su contexto, muere con él, y al hilo principal
vuelven solo las citas.

Ese es el criterio completo: **un subagente se justifica cuando la tarea lee mucho más de
lo que devuelve.** No cuando "es un paso distinto" ni cuando queda más ordenado el
diagrama.

## Por qué fallan las otras

- **A)** Es la que ya tenés y es la que produjo el síntoma. "Descartá lo irrelevante antes de escribir" no borra nada de la ventana: el modelo puede ignorar el material, pero sigue pagándolo en atención y en tokens. Pedirle a un prompt que arregle un problema de arquitectura de contexto casi nunca funciona.
- **C)** Es tentadora y es la más cara de descubrir que está mal. Aísla el contexto igual que B, pero el filtrado lo hace código o un modelo sin ver el ticket completo, así que la tool decide qué es relevante sin saber para qué. Además perdés la capacidad de reformular: si la primera consulta no devuelve nada, una tool no puede intentar de nuevo con otros términos, y un subagente sí.
- **D)** Aísla el contexto y encima paraleliza, así que parece estrictamente mejor. Cuesta tres arranques de agente, tres prompts que mantener sincronizados y tres ventanas de contexto, para ganar una latencia que ya conseguís con las tres tools llamadas en paralelo dentro de un solo subagente (ver [D-08](D-08-fanout-paralelo.md)). Y ninguno de los tres puede notar que el changelog contradice al ticket previo, porque ninguno ve lo que encontraron los otros.

## La trampa

Preguntarse **"¿esto es un paso distinto?"** en vez de **"¿esto lee mucho más de lo que
devuelve, o tiene un criterio propio que no comparte con nadie?"**. Con la primera pregunta
todo es un subagente y terminás en un sistema de cinco agentes donde alcanzaban dos —
exactamente `antipatterns/orchestrator.todo-subagente.ts`. La segunda pregunta deja pasar
dos: el `investigador`, por contexto, y el `redactor`, por rol.
