# antipatterns · las versiones malas, a propósito

Tres archivos escritos mal adrede. No son código muerto ni ejemplos viejos: son la versión
que la mayoría de los equipos construye primero, y están acá para leerlos **al lado** del
archivo bueno.

| Antipatrón | Contra | Dominio | Decisión |
|---|---|---|---|
| [`CLAUDE.monolitico.md`](CLAUDE.monolitico.md) | `CLAUDE.md` + `src/*/CLAUDE.md` | 2 · 20% | [D-02](../decisions/D-02-jerarquia-claude-md.md) |
| [`server.errores-humanos.ts`](server.errores-humanos.ts) | `src/mcp/server.ts` | 4 · 18% | [D-04](../decisions/D-04-errores-para-el-modelo.md) |
| [`orchestrator.todo-subagente.ts`](orchestrator.todo-subagente.ts) | `src/agents/orchestrator.ts` | 1 · 27% | [D-01](../decisions/D-01-buscador-tool-o-subagente.md) |

## Lo que tienen en común

**Ninguno está roto.** Los tres compilan en su intención, hacen lo que dicen, y pasarían una
revisión de código que mire estilo y cobertura. Ese es exactamente el punto: los errores de
criterio de arquitectura de agentes no se ven como bugs. Se ven como decisiones razonables
que escalan mal, y el costo aparece meses después — cuando el equipo crece, cuando el
contexto se llena, cuando el modelo empieza a no recuperarse de fallos que antes no pasaban.

Por eso los cinco dominios de la certificación están escritos alrededor de criterio y no de
sintaxis, y por eso estos tres archivos valen más que una lista de buenas prácticas. (Los
tres son inventados para este repo: no son código real de nadie ni material del examen.)

## Cómo usarlos

Abrí el antipatrón y el archivo bueno lado a lado y buscá **la línea donde se separan**. En
los tres casos es una sola decisión, tomada temprano, de la que se desprende todo lo demás.

Están fuera de `tsconfig.json` a propósito: no compilan con el resto y no se importan desde
ningún lado. Son material de lectura.
