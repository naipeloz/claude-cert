# support-insight-agent

Agente de soporte que convierte un ticket crudo en un JSON validado con evidencia citada.
Es a la vez un producto que funciona y el material de estudio de una charla sobre la
certificación Claude Certified Architect: cada archivo de `src/` responde una pregunta de
examen y cada decisión de diseño tiene su alternativa escrita en `decisions/`.

## Cómo se corre

```bash
npm install
npm run demo -- --ticket=TCK-1001   # un ticket de punta a punta, con la traza
npm run eval                        # los diez casos de evals/cases.json
npm run verificar                   # typecheck + cabeceras de dominio
```

Las credenciales salen de `ANTHROPIC_API_KEY` si está en el entorno o en `.env`, y si no
de la sesión de Claude Code. `.env` no se commitea nunca.

Los nombres de modelo NO se escriben en el código: van por variable de entorno con su
default en `src/config.ts`, que es el único archivo del repo donde aparece uno.

## Regla de oro

**Todo archivo de `src/` abre con su cabecera de dominio.** En `.ts` como comentario de
bloque, en `.md` como comentario HTML — el orquestador se la saca antes de mandarla al
modelo. El formato es:

```ts
/**
 * DOMINIO N · <Nombre del dominio> (<peso>%)
 *
 * Pregunta de examen que responde este archivo:
 *   «<la pregunta de diseño del dominio>»
 *
 * <2-4 líneas sobre el criterio aplicado acá>
 *
 * Ver: decisions/D-0X-<slug>.md
 */
```

Es lo que convierte el repo en material de estudio y no en un demo más. `npm run
check:cabeceras` falla si falta una, y CI corre ese chequeo antes que nada.

## Convenciones

- **Comentarios y documentación en español.** Identificadores en inglés donde ya es
  convención del ecosistema (`ticket_id`, `maxTurns`), en español donde es dominio propio
  (`decidirEscalado`, `UMBRALES`).
- Los comentarios explican **por qué esto y no las otras tres formas plausibles**, no qué
  hace la línea de abajo. Si un comentario se puede deducir del código, sobra.
- **Todo error de cara al modelo es accionable**: dice qué pasó, por qué, y cuál es el
  próximo paso concreto. Vale para los errores de las tools y para los de validación de
  schema por igual. Un error que el modelo no puede accionar garantiza que el reintento
  falle igual que el primer intento.
- Commits en imperativo y en español. Una rama y un PR por paquete de trabajo, con el
  número de dominio y su peso en el título.

## Límites de alcance

Este repo vale por poder leerse entero de una sentada. Cada archivo de más le quita eso.
No lleva: base de datos, servidor HTTP, frontend, Docker, framework de tests,
autenticación, telemetría, ni abstracciones "por si mañana" con una sola implementación.
No hay `utils/` ni `helpers/`: si algo no tiene un hogar claro, probablemente no va.

Ningún archivo pasa de 250 líneas. Si uno crece, la pregunta correcta es qué está haciendo
de más, no en cuántos pedazos partirlo.

## Dónde está cada cosa

`README.md` está organizado por dominio del examen y es el índice real del repo.
`decisions/` es el banco de práctica: ocho decisiones con cuatro opciones plausibles cada
una. `antipatterns/` tiene las versiones malas a propósito, para leer al lado de las buenas.
