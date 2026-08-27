# support-insight-agent

Entra un ticket de soporte crudo. Sale un JSON estructurado, validado, con evidencia citada,
listo para un dashboard.

Es un producto que funciona y, al mismo tiempo, el material de acompañamiento de la charla
**"Cómo es la certificación Claude Certified Architect"**. Cada archivo de `src/` ejercita
una pregunta de diseño de uno de los cinco dominios, y cada decisión tiene sus tres
alternativas escritas en [`decisions/`](decisions/).

El criterio de éxito de este repo no es que funcione: es que alguien que lo clone entienda
**por qué cada decisión se tomó así y no de las otras tres formas plausibles**.

> ### Qué es y qué no es este material
>
> Todo lo que hay acá son **ejemplos originales alineados a los cinco dominios** que la
> certificación publica en su temario. **No reproduce, no parafrasea y no anticipa preguntas
> del examen.** Nadie que escribió esto vio el examen.
>
> En concreto:
>
> - **Las cabeceras de los archivos** no son preguntas de examen. Son las preguntas de diseño
>   que este repo se hizo a sí mismo mientras se construía, agrupadas por el dominio al que
>   pertenecen.
> - **Las ocho decisiones de [`decisions/`](decisions/)** son decisiones reales de este
>   código, reescritas con formato de pregunta para poder usarlas como autoevaluación. Los
>   escenarios y las cuatro opciones están inventados para este repo.
> - **Los pesos porcentuales y los nombres de los dominios** salen del temario público. Nada
>   más de acá sale de material de la certificación.
>
> Que el registro se parezca al de una pregunta de examen es deliberado —sirve para
> practicar el tipo de razonamiento que la certificación evalúa— pero **no hay ninguna
> correspondencia con ítems reales, y haber leído esto no es haber visto el examen.**

## Cómo correrlo

```bash
npm install
cp .env.example .env          # opcional: sin ANTHROPIC_API_KEY usa tu sesión de Claude Code

npm run demo -- --ticket=TCK-1002   # un ticket de punta a punta, con la traza
npm run demo -- --ticket=TCK-1004   # el que no tiene respuesta en ninguna fuente
npm run eval -- --case=TCK-1005     # un caso del eval (~45s)
npm run eval                        # los diez casos con las cuatro métricas (~8 min)
npm run verificar                   # typecheck + cabecera de dominio en todo src/
```

Node 20+. Sin base de datos, sin servidor, sin Docker: los datos son tres arrays en
`src/data/fuentes.ts` y el JSON se imprime en consola.

## El caso

El agente no consulta una sola fuente: investiga en tres a la vez —base de conocimiento,
changelog de releases, tickets previos resueltos— porque un agente de soporte de verdad
tampoco consulta una sola.

```
clasificar ──▶ investigar ──▶ compactar ──▶ redactar + estructurar ──▶ decidir escalado
 haiku          opus            código          opus                     código
 sin tools      3 tools MCP     puro            tools: []                puro
 sin subagente  fan-out         policy.ts       solo evidencia           policy.ts
```

## Los seis escenarios del temario, y dónde están cubiertos

La idea que organiza todo el repo son **dos capas**: el producto cubre unos escenarios, y la
configuración del repo *en sí misma* cubre los otros dos.

| Escenario del temario | Lo cubre | Dónde |
|---|---|---|
| 1 · Agente de resolución de soporte | el producto | [`src/agents/`](src/agents/) |
| 2 · Claude Code a nivel equipo | **la configuración del repo** | [`CLAUDE.md`](CLAUDE.md) ×3, [`.claude/skills/nueva-tool/`](.claude/skills/nueva-tool/SKILL.md) |
| 3 · Sistema de research multi-agente | el producto | el fan-out del [`investigador`](src/agents/subagents.ts) |
| 4 · Herramientas de productividad vía MCP | el producto | [`src/mcp/server.ts`](src/mcp/server.ts) |
| 5 · Claude Code en CI/CD | **el workflow del repo** | [`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml) |
| 6 · Extracción de datos estructurados | el producto | [`src/schemas/ticketInsight.ts`](src/schemas/ticketInsight.ts) |

El `CLAUDE.md` jerárquico, la skill custom y el workflow de CI no son contenido del
proyecto: son **cómo el proyecto está hecho**.

---

# Los cinco dominios

Una sección por dominio del temario. Cada una abre con la pregunta de diseño que ese
dominio cubre —redactada acá, no tomada del examen— y nombra los archivos que la trabajan.

## Dominio 1 · Diseño de agentes (27%)

> **¿Cuándo algo merece ser un subagente, y quién decide el orden de los pasos?**

Hay **exactamente dos subagentes**, y están por razones distintas: `investigador` existe
**por el contexto** (lee diez documentos y devuelve cuatro citas, y todo lo descartado muere
con él), `redactor` existe **por el rol** (escribir para un cliente enojado es una tarea con
criterio propio, y va con `tools: []` a propósito para que no pueda tapar con una búsqueda
lo que la investigación no encontró).

El orquestador es lineal y explícito: el modelo decide qué decir en cada paso, el código
decide qué pasos hay.

- **Archivos:** [`src/agents/subagents.ts`](src/agents/subagents.ts) · [`src/agents/orchestrator.ts`](src/agents/orchestrator.ts) · [`src/index.ts`](src/index.ts)
- **Decisiones:** [D-01 · ¿tool o subagente?](decisions/D-01-buscador-tool-o-subagente.md) · [D-08 · ¿fan-out paralelo o secuencial?](decisions/D-08-fanout-paralelo.md)
- **Antipatrón:** [`orchestrator.todo-subagente.ts`](antipatterns/orchestrator.todo-subagente.ts) — cinco subagentes donde alcanzaban dos, uno de ellos para clasificar un texto de dos líneas.

## Dominio 2 · Claude Code a nivel equipo (20%)

> **¿Dónde vive el contexto que necesita quien programa acá, y cuándo deja de ser un párrafo?**

Tres `CLAUDE.md` en jerarquía, y la jerarquía es real: **ningún nivel repite al de arriba**.
La raíz tiene lo transversal, `src/agents/` tiene el criterio subagente-vs-tool, `src/mcp/`
tiene el checklist de una tool nueva. La demostración es que la jerarquía sirve para no
repetir, y eso solo se ve si de verdad no se repite.

Cuando una instrucción tiene **procedimiento** y no solo criterio, deja de ser un párrafo y
se vuelve una skill: por eso `nueva-tool` es una skill y "todo error es accionable" no.

- **Archivos:** [`CLAUDE.md`](CLAUDE.md) · [`src/agents/CLAUDE.md`](src/agents/CLAUDE.md) · [`src/mcp/CLAUDE.md`](src/mcp/CLAUDE.md) · [`.claude/skills/nueva-tool/SKILL.md`](.claude/skills/nueva-tool/SKILL.md) · [`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml)
- **Decisión:** [D-02 · ¿un `CLAUDE.md` o una jerarquía?](decisions/D-02-jerarquia-claude-md.md)
- **Antipatrón:** [`CLAUDE.monolitico.md`](antipatterns/CLAUDE.monolitico.md) — dieciséis secciones en la raíz, cinco sobre partes del sistema que no existen, y dos reglas que se contradicen a ciento veinte líneas de distancia.

## Dominio 3 · Prompts y salida estructurada (20%)

> **¿Cuándo un prompt va con ejemplos y cuándo con instrucciones, y cómo garantizás que la salida sea utilizable?**

Los dos criterios de prompting, uno en cada archivo, a propósito: `classify.md` va con
**few-shot** porque la tarea tiene forma (tres ejemplos, uno ambiguo); `compose.md` va con
**instrucciones** porque la tarea tiene reglas.

El schema es una sola fuente de verdad: `schemaParaPrompt()` deriva del mismo Zod que
valida, así que el prompt no se puede desincronizar. Y el mínimo de una cita no es una
sugerencia del prompt, es algo que el sistema no puede saltarse — con una sola salida, que
es admitir que no hay respuesta.

- **Archivos:** [`src/schemas/ticketInsight.ts`](src/schemas/ticketInsight.ts) · [`src/prompts/classify.md`](src/prompts/classify.md) · [`src/prompts/compose.md`](src/prompts/compose.md)
- **Decisión:** [D-03 · ¿schema validado o parseo tolerante?](decisions/D-03-schema-validado.md)

## Dominio 4 · Herramientas y MCP (18%)

> **¿Cómo diseñás una tool para que el modelo la use bien y se recupere cuando falla?**

Tres tools sobre un servidor MCP in-process. Cada descripción dice **cuándo usarla y cuándo
no**, nombrando la alternativa: *"NO la uses para saber si un bug ya fue corregido: para eso
está `consultar_changelog`"*. La descripción es prompt, no documentación.

Y todo camino de error dice qué pasó, por qué, y el próximo paso concreto — porque el
mensaje de error es la única información nueva que el modelo recibe entre un intento y el
siguiente. **Cero resultados no es un error**: es un resultado con instrucciones.

- **Archivos:** [`src/mcp/server.ts`](src/mcp/server.ts) · [`src/data/fuentes.ts`](src/data/fuentes.ts)
- **Decisiones:** [D-04 · ¿errores para humanos o para el modelo?](decisions/D-04-errores-para-el-modelo.md) · [D-06 · ¿MCP in-process o stdio?](decisions/D-06-mcp-in-process.md)
- **Antipatrón:** [`server.errores-humanos.ts`](antipatterns/server.errores-humanos.ts) — las mismas tres tools devolviendo `Error 400: Bad Request`, `null` y excepciones sin mensaje.

## Dominio 5 · Contexto y confiabilidad (15%)

> **Cuando el contexto no alcanza y las cosas fallan, ¿qué se tira y cuándo se rinde el agente?**

`compactar()` conserva la evidencia citada y descarta el material bruto **entero**. El error
clásico es compactar por antigüedad —"resumí los primeros N mensajes"— porque eso pierde
justo las citas, que es lo único que no se puede reconstruir.

`decidirEscalado()` son seis reglas ordenadas de más grave a menos, y **la primera que
dispara gana**. El orden es la decisión: un cliente que menciona cancelar va a una persona
aunque el agente esté segurísimo de la respuesta técnica.

- **Archivos:** [`src/context/policy.ts`](src/context/policy.ts) · [`evals/run.ts`](evals/run.ts)
- **Decisiones:** [D-05 · ¿compactar por antigüedad o por rol?](decisions/D-05-compactar-por-rol.md) · [D-07 · ¿reintentar o escalar, y en qué orden?](decisions/D-07-reintentar-o-escalar.md)

---

## Las cinco paradas de la demo

Diez minutos, cinco archivos, sin abrir nada más.

| | Parada | Archivo | Qué se muestra |
|---|---|---|---|
| 1 | El orquestador | [`src/agents/orchestrator.ts`](src/agents/orchestrator.ts) | Dos subagentes, y por qué clasificar no es uno |
| 2 | La jerarquía | [`CLAUDE.md`](CLAUDE.md) → [`src/mcp/CLAUDE.md`](src/mcp/CLAUDE.md) | Ningún nivel repite al de arriba — la capa meta |
| 3 | El contrato | [`src/schemas/ticketInsight.ts`](src/schemas/ticketInsight.ts) + [`compose.md`](src/prompts/compose.md) | El mínimo de una cita, y el error redactado para el modelo |
| 4 | Las tools | [`src/mcp/server.ts`](src/mcp/server.ts) | El mensaje del id mal formado, leído en voz alta |
| 5 | La política | [`src/context/policy.ts`](src/context/policy.ts) | Seis reglas ordenadas, y por qué "cancelar" está primera |

Y en vivo, dos corridas:

```bash
npm run demo -- --ticket=TCK-1002   # responde solo, con cuatro citas
npm run demo -- --ticket=TCK-1005   # respuesta técnica perfecta, y escala igual
```

La segunda es la que cierra la charla: el agente sabe la respuesta, la escribe bien, y el
sistema decide que ese ticket lo tiene que ver una persona.

## Estudiar con esto después

[`decisions/`](decisions/) es un banco de práctica de ocho preguntas sobre decisiones de
diseño de este repo, escritas con formato de opción múltiple. Tapá la sección "Elegida",
respondé, y comparate. Lo que importa no es acertar la letra: es que tu razón coincida con
la razón. **No son preguntas de examen** — ver el recuadro del principio.

[`antipatterns/`](antipatterns/) son tres archivos escritos mal a propósito. Ninguno está
roto: los tres pasarían una revisión de código. Abrilos al lado del archivo bueno y buscá la
línea donde se separan.
