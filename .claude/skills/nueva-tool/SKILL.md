---
name: nueva-tool
description: Agrega una tool nueva al servidor MCP de soporte aplicando el checklist completo de src/mcp/CLAUDE.md. Usala cuando haya que exponerle una fuente o una capacidad nueva al agente, o cuando haya que revisar una tool existente contra el checklist.
---

# Agregar una tool al servidor de soporte

Esta skill existe porque el checklist de `src/mcp/CLAUDE.md` se aplica siempre igual, en un
orden que importa, y con un paso de verificación que es fácil saltearse. Una instrucción que
se repite en cada PR y tiene procedimiento deja de ser un párrafo en un `CLAUDE.md` y se
vuelve una skill: el `CLAUDE.md` dice **cuál es el criterio**, la skill dice **cómo se
ejecuta**. Si esto viviera en el `CLAUDE.md`, ocuparía contexto en cada sesión, incluidas las
que no tocan tools.

## Antes de escribir nada

Contestá esto y si la respuesta es "sí" a cualquiera, **no agregues la tool**:

- ¿Se solapa con `buscar_kb`, `consultar_changelog` o `buscar_tickets_previos`? El modelo va
  a elegir mal entre dos tools parecidas y ninguna descripción lo arregla.
- ¿Es en realidad un parámetro más de una tool que ya existe?
- ¿La va a usar el agente, o la querés para depurar? Para depurar está `npm run demo`.

## Los pasos

1. **Escribí la descripción primero, antes que el handler.** Si no podés decir en dos líneas
   cuándo usarla y cuándo no —nombrando la alternativa por su nombre—, la tool no está bien
   delimitada y el problema es de diseño, no de redacción.

2. **Definí los parámetros con `.describe()` y un ejemplo real en cada uno.** El ejemplo sale
   de un caso de `evals/cases.json`, no inventado.

3. **Enumerá los caminos de error antes de escribir el handler.** Para cada uno, redactá el
   mensaje con las tres partes: qué pasó (con el valor que falló), por qué, y qué hacer ahora
   (con el formato esperado y un ejemplo). Mirá `consultarChangelog` en `src/mcp/server.ts`
   como referencia.

4. **Resolvé el caso de cero resultados explícitamente.** No es un error: devolvé
   `isError: false` con la instrucción de reformular una vez y, si tampoco hay nada, marcar
   `requiere_humano`. Reusá el helper `sinResultados` en vez de escribir otro mensaje.

5. **Sumá la tool a `TOOLS_SOPORTE`** en `src/mcp/server.ts`. Sin eso el subagente no la ve,
   porque `allowedTools` sale de ahí.

6. **Actualizá el prompt de `INVESTIGADOR`** en `src/agents/subagents.ts` si la tool cambia
   qué fuentes hay que consultar en el fan-out inicial.

## Verificación

No está terminada hasta que:

```bash
npm run verificar                       # typecheck + cabecera de dominio
npm run demo -- --ticket=TCK-1004       # el caso sin cobertura: la tool nueva no tiene que inventar
npm run eval                            # las cuatro métricas no empeoran
```

Y una prueba a mano que el eval no cubre: **llamá la tool con un parámetro mal formado** y
leé el mensaje de error poniéndote en el lugar del modelo. Si con ese texto no sabrías qué
corregir, el mensaje está mal escrito aunque el código esté bien.
