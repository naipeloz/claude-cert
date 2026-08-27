# decisions · el banco de práctica

Ocho decisiones de diseño **de este repo**, reescritas con formato de opción múltiple: un
escenario de producción, cuatro opciones plausibles, la elegida, por qué fallan las otras
tres, y la trampa que hace elegir mal.

> **No son preguntas del examen.** Ni tomadas, ni parafraseadas, ni reconstruidas de
> memoria. Son decisiones que se tomaron construyendo este código, escritas después con
> formato de pregunta para poder usarlas como autoevaluación. Los escenarios, las cuatro
> opciones y las trampas están inventados acá. Lo único que sale del temario público de la
> certificación son los nombres de los dominios y sus pesos porcentuales.
>
> El formato imita el registro de una pregunta de certificación **a propósito**, porque
> practicar el razonamiento en ese formato ayuda. Pero acertar las ocho de acá no dice nada
> sobre qué va a preguntar el examen.

## Cómo usarlo para estudiar

**Tapá la sección "Elegida" y todo lo que sigue.** Leé el escenario y las cuatro opciones,
elegí una y escribí en una línea por qué. Recién ahí destapá y comparate.

Lo que importa no es acertar la letra: es que tu razón coincida con la razón. Se puede
acertar por el motivo equivocado, y ese acierto no se repite cuando el escenario cambia un
poco — que es exactamente lo que va a pasar en cualquier pregunta que no sea esta. Si tu
razón fue "porque es más limpio" o "es la buena práctica", esa respuesta no va a sobrevivir
al próximo escenario.

**Las cuatro opciones son plausibles a propósito.** Ninguna es de relleno: las cuatro son
cosas que alguien construyó en producción y defendió en una revisión de diseño. Si te
parece que una es obviamente absurda, volvé a leerla — probablemente sea la que elegirías
en un sistema con restricciones apenas distintas, y ese "apenas distintas" es donde está
todo el criterio que vale la pena practicar.

## Las ocho

| | Pregunta | Dominio | Archivos |
|---|---|---|---|
| [D-01](D-01-buscador-tool-o-subagente.md) | ¿El buscador es tool o subagente? | 1 · 27% | `src/agents/` |
| [D-02](D-02-jerarquia-claude-md.md) | ¿Un `CLAUDE.md` o una jerarquía? | 2 · 20% | `CLAUDE.md`, `src/*/CLAUDE.md` |
| [D-03](D-03-schema-validado.md) | ¿Schema validado o parseo tolerante? | 3 · 20% | `src/schemas/ticketInsight.ts` |
| [D-04](D-04-errores-para-el-modelo.md) | ¿Errores para humanos o para el modelo? | 4 · 18% | `src/mcp/server.ts` |
| [D-05](D-05-compactar-por-rol.md) | ¿Compactar por antigüedad o por rol del dato? | 5 · 15% | `src/context/policy.ts` |
| [D-06](D-06-mcp-in-process.md) | ¿MCP server in-process o stdio? | 4 · 18% | `src/mcp/server.ts` |
| [D-07](D-07-reintentar-o-escalar.md) | ¿Reintentar o escalar, y en qué orden? | 5 · 15% | `src/context/policy.ts` |
| [D-08](D-08-fanout-paralelo.md) | ¿Fan-out paralelo o investigación secuencial? | 1 · 27% | `src/agents/subagents.ts` |

## Cuando escribas la novena

Mismo formato, y un solo criterio de aceptación: **si podés descartar una opción sin pensar,
esa opción está mal escrita.** Reescribila hasta que sea la respuesta correcta de algún
sistema real, y que lo que la descarte acá sea una restricción concreta de este sistema y no
un juicio general.
