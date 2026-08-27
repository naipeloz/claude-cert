# D-02 · ¿Un `CLAUDE.md` en la raíz o una jerarquía?

**Dominio:** Claude Code a nivel equipo (20%)
**Archivos:** `CLAUDE.md`, `src/agents/CLAUDE.md`, `src/mcp/CLAUDE.md`

## El escenario

Cinco personas trabajan sobre el mismo repo con Claude Code. El `CLAUDE.md` de la raíz
arrancó con veinte líneas y hoy tiene trescientas: convenciones de commits, el checklist de
cómo agregar una tool, las reglas de accesibilidad del frontend, cómo se nombran las
migraciones. Nadie lo lee entero. Dos personas ya reportaron que el agente les propone
cosas que no aplican a lo que están tocando, y una tercera agregó una regla que contradice
otra que estaba doscientas líneas más arriba.

## Las opciones

- **A)** Un `CLAUDE.md` en la raíz, bien organizado con encabezados por área, y que cada uno lea la sección que le toca.
- **B)** Una jerarquía: la raíz con lo transversal, y un `CLAUDE.md` por carpeta con lo específico de esa carpeta.
- **C)** Un `CLAUDE.md` mínimo en la raíz y todo lo demás convertido en skills, que se cargan solo cuando hacen falta.
- **D)** Un `CLAUDE.md` por persona en configuración de usuario, con las reglas del área en la que cada uno trabaja.

## Elegida: B

Un `CLAUDE.md` de carpeta se carga cuando el agente toca esa carpeta. Eso hace dos cosas al
mismo tiempo: **el contexto que llega es el que aplica**, y **cada regla tiene un solo
dueño**, que es la carpeta donde vive. La regla de las tools está en `src/mcp/CLAUDE.md`
porque es de las tools; si mañana cambia, cambia en un lugar y nadie tiene que buscar si
había otra copia.

El criterio de aceptación de la jerarquía es que **ningún nivel repita lo del nivel de
arriba**. Una jerarquía donde el archivo de la carpeta repite las convenciones generales
"por las dudas" tiene los mismos problemas del monolito, repartidos.

## Por qué fallan las otras

- **A)** Organizar por encabezados ordena la lectura humana pero no cambia lo que se carga: las trescientas líneas entran igual en cada sesión, incluidas las de frontend cuando estás tocando el orquestador. Y el problema de las reglas contradictorias no es de orden, es de que dos áreas escriben en el mismo archivo.
- **C)** Es correcta para las instrucciones con **procedimiento** —por eso `nueva-tool` es una skill— y equivocada para los **criterios**. "Todo error de cara al modelo es accionable" tiene que estar presente siempre, no invocarse; una convención que hay que acordarse de cargar no es una convención. La regla práctica: si tiene pasos, es skill; si es un criterio que se aplica al escribir cualquier línea, es `CLAUDE.md`.
- **D)** Resuelve el ruido y rompe lo importante: las convenciones dejan de estar en el repo. Alguien que clona no recibe nada, el archivo no se revisa en un PR, y cuando dos personas tienen reglas distintas para la misma carpeta el repo termina con dos estilos y ninguna discusión donde resolverlo.

## La trampa

Tratar el `CLAUDE.md` como **documentación** en vez de como **contexto que se carga**. Como
documentación, un archivo largo y ordenado es mejor que varios cortos. Como contexto, cada
línea que no aplica compite con las que sí, y la métrica correcta no es qué tan completo
está sino cuánto de lo que se carga es pertinente. `antipatterns/CLAUDE.monolitico.md` es
esa confusión llevada a trescientas líneas: no está mal escrito, está mal ubicado.
