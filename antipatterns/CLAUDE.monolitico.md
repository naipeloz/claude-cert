<!--
ANTIPATRÓN · Un solo CLAUDE.md para todo el repo

Qué está mal: trescientas líneas en la raíz, escritas por cinco equipos a lo largo de dos
años. Está bien redactado, bien organizado con encabezados, y actualizado. El problema no es
la calidad: es que se carga entero en cada sesión, así que alguien que toca el orquestador
recibe las reglas de accesibilidad del frontend, la convención de nombres de migraciones y
la política de imágenes de Docker.

Lo que cuesta: contexto ocupado por reglas que no aplican, y reglas que se contradicen entre
sí sin que nadie lo note porque están a doscientas líneas de distancia (mirá la sección de
commits contra la de PRs, más abajo). Cuando algo cambia, hay que buscar si había otra copia.

Lo que hay que ver: este archivo funciona perfecto para una persona sola. Se rompe con cinco
equipos, y se rompe de a poco, así que nadie tiene el momento en el que decidir partirlo.

La versión buena: /CLAUDE.md + /src/agents/CLAUDE.md + /src/mcp/CLAUDE.md
Ver: decisions/D-02-jerarquia-claude-md.md
-->

# Convenciones del repo

Este documento es la fuente de verdad para todo el equipo. Leelo entero antes de tu primer PR.

## 1. Idioma y estilo

- Comentarios en español. Identificadores en inglés.
- Comillas simples en TypeScript, dobles en JSON.
- Punto y coma siempre.
- Máximo 100 caracteres por línea, salvo en strings de prompts.
- Nada de `any`. Si hace falta, `unknown` y un narrowing explícito.

## 2. Commits

- En imperativo y en español: "agrega la tool de changelog", no "agregada" ni "agregando".
- Un commit por cambio lógico. Nada de "wip" en `main`.
- El cuerpo del commit explica el porqué, no el qué.
- Referenciar el issue con `#NNN` al final del título.

## 3. Pull requests

- Título con el número de dominio y su peso: `WP-1 · MCP y tools (dominio 4, 18%)`.
- Descripción con qué cambia, por qué, y cómo se verificó.
- **Los commits del PR se aplastan en uno solo al mergear**, así que el mensaje individual
  de cada commit no importa demasiado.
- Un aprobador como mínimo. Dos si toca `src/context/policy.ts`.

> Esta última regla contradice la sección 2, que pide un commit por cambio lógico con el
> porqué en el cuerpo. Si todo se aplasta, ese cuerpo se pierde. Nadie lo notó en dos años
> porque están a ciento veinte líneas de distancia. Es el modo de falla característico del
> archivo monolítico: no produce errores, produce reglas muertas.

## 4. Frontend

- Componentes en PascalCase, hooks con prefijo `use`.
- Todo componente interactivo necesita un `aria-label` o un texto accesible.
- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande.
- Los estados de carga usan el skeleton compartido, no un spinner propio.
- Nada de estilos en línea; todo por tokens del sistema de diseño.
- Las imágenes se sirven en AVIF con fallback a WebP.

> Este repo no tiene frontend. La sección quedó de cuando el monorepo incluía el dashboard,
> hace catorce meses. Se sigue cargando en cada sesión.

## 5. Base de datos y migraciones

- Una migración por PR, nunca dos.
- Nombre: `NNNN_verbo_sustantivo.sql`, con el número correlativo.
- Toda migración tiene su `down`, aunque no se use.
- Nada de `DROP COLUMN` en una sola release: primero se deja de escribir, después se borra.

> Tampoco hay base de datos. Los datos son tres arrays en `src/data/fuentes.ts`.

## 6. Tools y MCP

- Cada tool lleva una descripción que dice cuándo usarla y cuándo no.
- Los parámetros llevan `.describe()` con un ejemplo real.
- Todo camino de error devuelve qué pasó, por qué, y el próximo paso concreto.
- Cero resultados no es un error.

> Estas cuatro líneas son las únicas de todo el archivo que le sirven a quien está tocando
> `src/mcp/`. Están en la posición seis de nueve, después de dos secciones sobre partes del
> sistema que no existen.

## 7. Agentes

- No más de dos subagentes.
- El orquestador es lineal.
- Registrar cada paso en la traza.

## 8. Docker e infraestructura

- Imágenes basadas en `node:20-alpine`, nunca `latest`.
- Multi-stage build obligatorio; la imagen final no lleva devDependencies.
- Los secretos se inyectan por variable de entorno, nunca en la imagen.
- Healthcheck en todo servicio de larga vida.

> No hay Docker. Ver la sección de límites de alcance del CLAUDE.md bueno.

## 9. Tests

- Cobertura mínima 80% en `src/`.
- Los tests unitarios corren en cada push, los de integración solo en `main`.
- Nada de mocks de la API de Anthropic: usar el servidor de pruebas.

> No hay framework de tests. El eval es el test.

## 10. Observabilidad

- Todo log estructurado en JSON, con `trace_id` y `span_id`.
- Niveles: `debug` solo en desarrollo, `info` para eventos de negocio, `warn` para lo
  degradado pero recuperable, `error` solo para lo que despierta a alguien.
- Nunca loguear el cuerpo de un ticket: puede tener datos del cliente.
- Las métricas van a Prometheus con el prefijo `soporte_`.
- Todo endpoint expone latencia p50, p95 y p99.
- Los dashboards viven en el repo de infraestructura, no acá.
- Las alertas se definen junto a la métrica, en el mismo PR.
- Retención de logs: 30 días en caliente, 180 en frío.

## 11. Seguridad

- Nada de secretos en el repo. Se usa el gestor de secretos del cluster.
- Las dependencias se auditan semanalmente con `npm audit`.
- Toda dependencia nueva necesita aprobación de seguridad si tiene menos de mil descargas
  semanales o menos de seis meses de vida.
- Los tokens de la API rotan cada 90 días.
- El acceso a producción es por bastión, con MFA, y queda registrado.
- Los datos de clientes se anonimizan en los entornos que no son producción.
- Todo PR que toque autenticación necesita revisión del equipo de seguridad.

## 12. Internacionalización

- Todo texto de cara al usuario pasa por el catálogo de traducciones.
- Las claves son jerárquicas y en inglés: `support.ticket.escalated`.
- Nada de concatenar strings traducidos: usar interpolación con variables nombradas.
- Los plurales usan las reglas de ICU, no un `if`.
- Las fechas y números se formatean con `Intl`, nunca a mano.
- El idioma por defecto es `es-AR`; el fallback es `en-US`.

## 13. Proceso de release

- Versionado semántico. Un `breaking` necesita nota de migración.
- Las releases salen los martes y jueves, nunca un viernes.
- La rama `main` está siempre desplegable.
- Feature flags para todo lo que tarde más de una release en terminarse.
- El changelog se genera de los títulos de PR, así que el título importa.
- Rollback automático si el error rate supera 2% en los primeros diez minutos.
- Toda release tiene un responsable de guardia nombrado en el canal.

## 14. Checklist de revisión de código

- ¿El cambio hace una sola cosa?
- ¿Los nombres dicen qué es, no cómo está implementado?
- ¿Hay algún `TODO` sin issue asociado?
- ¿Los tests cubren el camino de error, no solo el feliz?
- ¿Se agregó alguna dependencia? ¿Estaba justificada?
- ¿El diff tiene menos de 400 líneas? Si no, ¿se puede partir?
- ¿Alguien fuera del equipo entiende el PR leyendo solo la descripción?
- ¿Se actualizó la documentación que este cambio deja vieja?
- ¿El cambio es reversible sin migración de datos?

## 15. Onboarding

- Primer día: acceso a repos, cluster de staging y canal de guardia.
- Primera semana: un PR chico que toque código de verdad, no documentación.
- Primer mes: una guardia acompañada.
- El buddy asignado revisa los primeros cinco PR sin excepción.
- La sesión de arquitectura es los primeros lunes de cada mes.

## 16. Glosario

- **Ticket**: una consulta entrante de un cliente. No confundir con issue.
- **Insight**: la salida estructurada del agente para un ticket.
- **Escalado**: derivar un ticket a una persona.
- **Fuente**: cada uno de los tres orígenes de evidencia.
- **Traza**: el registro de los pasos que dio el agente.
- **Umbral**: un valor de la política que dispara una decisión.
- **Fan-out**: consultar varias fuentes en paralelo en un mismo turno.
- **Compactación**: liberar contexto descartando material recuperable.

---

*Última revisión completa: hace catorce meses. Secciones agregadas desde entonces: 4, 8, 10,
11, 12. Secciones eliminadas desde entonces: ninguna.*
