# Tools y servidor MCP

## Checklist de una tool nueva

Una tool no está terminada hasta que las cinco líneas se cumplen. La skill
`.claude/skills/nueva-tool/` guía el proceso paso a paso.

1. **La descripción dice cuándo usarla Y cuándo no**, y nombra la tool alternativa por su
   nombre. La descripción es prompt: es lo único que el modelo lee para elegir. "Busca en la
   base de conocimiento" no distingue nada; "NO la uses para saber si un bug ya fue
   corregido: para eso está `consultar_changelog`" sí.
2. **Cada parámetro lleva `.describe()` con un ejemplo real.** `consulta: "la consulta"` no
   agrega información; `'Términos del producto, no la queja del cliente. Ej: "exportar PDF
   tabla ancha"'` le enseña a llamarla bien de entrada.
3. **Todo camino de error devuelve qué pasó, por qué y el próximo paso concreto.** Incluye
   el valor que falló y el formato esperado con un ejemplo. Un `Error 400` obliga al modelo
   a adivinar, y adivina mal.
4. **Cero resultados NO es un error.** Es un resultado que tiene que decir qué hacer ahora,
   y acotar el reintento —reformular una vez— para que el modelo no entre en bucle. Si la
   segunda consulta tampoco devuelve nada, la instrucción es marcar `requiere_humano`.
5. **La tool no decide, informa.** Devuelve lo que encontró; qué hacer con eso es del
   orquestador y de `src/context/policy.ts`. Una tool que filtra por su cuenta esconde
   información que el modelo necesitaba.

## Cuándo NO agregar una tool

Si la nueva tool se solapa con una existente, el modelo va a elegir mal entre las dos y
ninguna descripción lo arregla. Antes de agregar, revisá si es un parámetro más de una tool
que ya existe. Tres tools que hacen tres cosas distintas se usan bien; seis que hacen cosas
parecidas se usan mal.

## In-process, no stdio

El servidor es in-process porque estas fuentes son de este agente y de nadie más. Un
servidor separado agrega un proceso que desplegar, un contrato que versionar y un modo de
falla nuevo, a cambio de un reuso que hoy no existe. El día que haya un segundo consumidor,
mover esto a stdio es cambiar `server.ts` y la línea de `mcpServers` del orquestador.
