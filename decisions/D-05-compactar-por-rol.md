# D-05 · ¿Compactar por antigüedad o por rol del dato?

**Dominio:** Contexto y confiabilidad (15%)
**Archivos:** `src/context/policy.ts`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

Los tickets largos —los que tienen ida y vuelta con el cliente y varias rondas de
búsqueda— llegan al final del flujo con la ventana casi llena. Necesitás liberar contexto
antes del paso de redacción. Al equipo se le ocurren cuatro formas y todas parecen
razonables; el jefe de equipo se inclina por la primera porque es la que ya usan en el
agente de código.

## Las opciones

- **A)** Resumir los primeros N mensajes del historial y reemplazarlos por el resumen, dejando los últimos intactos.
- **B)** Conservar entera la evidencia citada y descartar entero el material bruto de las búsquedas, sin resumir nada.
- **C)** Resumir el material bruto de las búsquedas en un párrafo por fuente, y conservar ese párrafo.
- **D)** Recortar por presupuesto de tokens: ir descartando desde el mensaje más largo hasta entrar en el límite.

## Elegida: B

La pregunta correcta no es **qué es viejo**, es **qué se puede reconstruir**. El
razonamiento del modelo se vuelve a generar en el turno siguiente; una cita perdida obliga a
volver a buscar, y si la segunda búsqueda no la devuelve —porque la consulta fue distinta,
porque el índice cambió— el sistema termina afirmando cosas sin fuente.

Por eso el criterio es por **rol del dato**: la evidencia citada es lo único irrecuperable,
así que se conserva entera; el material bruto es recuperable y voluminoso, así que se
descarta entero. Y no se resume nada, porque un resumen es una tercera versión de la verdad
que ya no se puede auditar contra la fuente.

## Por qué fallan las otras

- **A)** Es la más usada y la que peor funciona acá. En un agente de código lo viejo suele ser exploración descartable; en un agente de investigación lo viejo son los resultados de las búsquedas, o sea las citas. El mismo procedimiento, aplicado a un flujo con otra forma, tira exactamente lo que había que conservar. Que funcione en otro agente del mismo equipo es lo que la hace peligrosa.
- **C)** Es B pero "sin desperdiciar". El párrafo resumido conserva el contenido y pierde la trazabilidad: una vez resumido, ya no podés poner una cita literal con su id, y la respuesta al cliente pasa de "según KB-014, ..." a "según la documentación, ...". Además el resumen lo produce un modelo, así que agrega un lugar más donde se puede colar algo que la fuente no decía.
- **D)** Optimiza la métrica equivocada: entra en el límite de tokens sin ninguna noción de qué está tirando. Como los resultados de búsqueda son los mensajes más largos, en la práctica se comporta como A pero peor, porque el orden en que descarta depende de cuán verboso fue cada documento.

## La trampa

Que **"compactar" suene a "resumir"**. Resumir es una operación con pérdida sobre contenido
que ya tenías; compactar bien es decidir **qué categoría de dato sobrevive**, y para muchas
categorías la respuesta correcta no es un resumen sino descartar del todo o conservar
literal. La pregunta que ordena todo es: *si tiro esto, ¿lo puedo volver a conseguir igual?*
