# D-06 · ¿El servidor MCP va in-process o como proceso stdio?

**Dominio:** Herramientas y MCP (18%)
**Archivos:** `src/mcp/server.ts`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

Las tres fuentes del agente —base de conocimiento, changelog, tickets previos— hoy son tres
consultas a la base de datos de soporte. Las exponés como tools MCP. En la revisión de
diseño alguien plantea que un servidor MCP aparte sería más prolijo, y que el equipo de
datos podría querer las mismas consultas para su asistente interno. Todavía no las pidió.

## Las opciones

- **A)** Servidor MCP in-process, creado con `createSdkMcpServer` dentro de la misma aplicación.
- **B)** Servidor MCP como proceso separado por stdio, arrancado por la aplicación.
- **C)** Servidor MCP remoto por HTTP, desplegado como servicio propio con su versionado.
- **D)** Sin MCP: las tres consultas como funciones normales, llamadas desde el orquestador entre pasos.

## Elegida: A

**Estas fuentes son de este agente y de nadie más, hoy.** Un servidor separado agrega un
proceso que desplegar, un contrato que versionar y un modo de falla nuevo —el proceso no
arranca, o arranca con otra versión— a cambio de un reuso que todavía no existe.

Y el costo de cambiar de opinión es bajo y conocido: el día que haya un segundo consumidor,
pasar de A a B es mover `server.ts` a su propio entrypoint y cambiar la línea de
`mcpServers` en el orquestador. Las tools, las descripciones y los mensajes de error —que es
donde está el trabajo real— no se tocan.

## Por qué fallan las otras

- **B)** Es la respuesta correcta al escenario donde el equipo de datos **ya** pidió las consultas. Acá paga hoy el costo de un reuso hipotético: si el asistente interno nunca llega, quedó un proceso más en el diagrama de despliegue para siempre. Y si llega, sus necesidades no van a ser exactamente estas — casi nunca lo son — así que el contrato que congelaste por adelantado va a ser el equivocado.
- **C)** Todo lo de B más red, autenticación, latencia y un servicio con su propio ciclo de vida. Es la respuesta correcta cuando los consumidores están en otras organizaciones o en otros lenguajes; para un consumidor que vive en el mismo proceso, es infraestructura pura.
- **D)** Es la única que se descarta por una razón de diseño y no de despliegue, y por eso es la más interesante. Como funciones, el orquestador tendría que decidir de antemano qué buscar y con qué términos. Todo el valor de que sean tools es que **el modelo elige cuál llamar, con qué consulta, y puede reformular cuando no encuentra nada** — que es justo lo que hace el `investigador`. Convertirlas en funciones convierte al agente en un pipeline.

## La trampa

Confundir **límite de despliegue** con **límite de diseño**. In-process contra stdio es una
decisión de empaquetado, reversible en una tarde, y se toma con la información de hoy. Qué
hace cada tool, cómo se describe y qué devuelve cuando falla es la decisión de diseño, y esa
es la cara. Gastar la discusión de diseño en el empaquetado suele terminar con un servidor
MCP impecablemente desplegado cuyas tools el modelo no sabe cuándo usar.
