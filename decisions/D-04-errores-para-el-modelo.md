# D-04 · ¿Los errores de las tools se escriben para humanos o para el modelo?

**Dominio:** Herramientas y MCP (18%)
**Archivos:** `src/mcp/server.ts`, `src/schemas/ticketInsight.ts`

> Decisión real de este repo, escrita con formato de opción múltiple para poder practicar
> con ella. **No es una pregunta del examen**: el escenario y las cuatro opciones están
> inventados acá. Ver [`decisions/README.md`](README.md).

## El escenario

Tus tools están instrumentadas como corresponde: validan los parámetros, devuelven códigos
de estado y registran cada fallo con su stack trace. Revisando trazas de producción notás un
patrón: cuando una tool devuelve error, el agente reintenta con exactamente los mismos
parámetros, dos o tres veces, y después responde igual sin esa fuente. El caso más común es
un id de ticket mal formado: el agente manda `TCK1023` sin guion, recibe
`Error 400: Bad Request`, y vuelve a mandar `TCK1023`.

## Las opciones

- **A)** Códigos y mensajes estándar (`400 Bad Request`, `404 Not Found`), que son los que ya entiende el resto de la infraestructura.
- **B)** Mensajes escritos para el modelo: qué pasó con el valor que falló, por qué, y el próximo paso concreto con el formato esperado y un ejemplo.
- **C)** Normalizar del lado de la tool: aceptar `TCK1023` y arreglarlo por dentro, para que el error no ocurra.
- **D)** Un prompt más explícito en el subagente que documente el formato de cada parámetro antes de que llame a las tools.

## Elegida: B

El mensaje de error es **la única información nueva que el modelo recibe entre un intento y
el siguiente**. Si ese mensaje no dice qué corregir, el reintento no puede ser distinto del
primer intento — y eso es exactamente lo que muestran las trazas.

El caso canónico del repo, tal cual está en `server.ts`:

> No pude interpretar el identificador TCK1023. El formato es TCK seguido de guion y cuatro
> dígitos, por ejemplo TCK-9931. Volvé a llamar con ese formato, u omití el parámetro si no
> lo conocés.

Tres partes: qué pasó **con el valor concreto**, cuál es el formato **con un ejemplo**, y
las opciones que tiene ahora **incluyendo la de seguir sin el parámetro**. El mismo criterio
aplica a los errores de validación de schema, por la misma razón.

## Por qué fallan las otras

- **A)** `400 Bad Request` es correcto y no es información: dice que algo estuvo mal, no qué ni cómo se arregla. Es la elección por defecto de quien piensa las tools como una API, donde del otro lado hay un desarrollador que va a leer la documentación. Del otro lado de una tool hay un modelo que solo tiene ese string.
- **C)** Arregla el síntoma que ya viste y no el que viene. Aceptar `TCK1023` está bien como tolerancia, pero convierte a la tool en el lugar donde se acumulan las excepciones, y el modelo nunca aprende el formato: la próxima vez que necesite un id para otra cosa —ponerlo en una cita, por ejemplo— lo va a escribir mal igual, y ahí no hay ninguna tool que lo normalice.
- **D)** Ayuda en el primer intento y no sirve en el momento del fallo, que es cuando el modelo necesita saber qué hizo mal. Documentar los formatos en el prompt es correcto —para eso están los `.describe()` con ejemplo— pero es un complemento del mensaje de error, no un reemplazo: el prompt está veinte turnos atrás y el error está acá.

## La trampa

Pensar en el error como **registro de lo que pasó** en vez de como **instrucción de lo que
sigue**. Un log es para vos, mañana, con el código adelante; un error de tool es para el
modelo, ahora, sin nada más. `antipatterns/server.errores-humanos.ts` son las mismas tres
tools escritas con el primer criterio: nada está roto, y el agente igual no se recupera de
nada.

Corolario que aparece seguido: **cero resultados no es un error**. Es un resultado, y
también necesita decir qué hacer a continuación — reformular una vez y, si tampoco hay
nada, marcar `requiere_humano`. Una tool que devuelve `[]` sin más deja al modelo eligiendo
entre insistir para siempre o inventar.
