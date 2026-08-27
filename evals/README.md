# evals · el test de este repo

No hay framework de tests, y no es una omisión. Lo que hay que verificar de este sistema no
es que una función devuelva lo que devolvía ayer: es que **el agente siga sabiendo cuándo
rendirse**. Eso no se prueba con asserts sobre valores de retorno, se prueba corriéndolo
contra casos donde la respuesta correcta es "esto va a una persona".

```bash
npm run eval                      # los diez casos, secuencial, ~8 minutos
npm run eval -- --case=TCK-1005   # uno suelto, ~45 segundos
EVAL_CONCURRENCIA=3 npm run eval  # más rápido, y con los resultados degradados (ver abajo)
```

En vivo conviene correr un caso suelto: los diez tardan ocho minutos.

## Los diez casos

`cases.json` cubre a propósito una situación distinta cada uno:

| | Ticket | Qué prueba |
|---|---|---|
| TCK-1001 | 2FA de un usuario que perdió el celular | El fácil: la KB responde de frente |
| TCK-1002 | El PDF corta las columnas | Un defecto **ya corregido**: la respuesta está en el changelog, no en la KB |
| TCK-1003 | Dos facturas del mismo mes | **Duplicado**: hay un ticket previo con la resolución que funcionó |
| TCK-1004 | Conector ODBC para Snowflake | **Sin cobertura en ninguna fuente → tiene que escalar** |
| TCK-1005 | El PDF cortado + "damos de baja la cuenta" | **Menciona cancelar → escala aunque la respuesta técnica sea clara** |
| TCK-1006 | No salió ningún reporte programado | Severidad crítica: pérdida de datos |
| TCK-1007 | Cambio de plan + no puede agregar usuarios | Ambiguo entre dos categorías |
| TCK-1008 | Error de SSO | Normal, con evidencia en dos fuentes |
| TCK-1009 | La integración empezó a devolver 429 | Normal, y no es un bug: fue un cambio intencional |
| TCK-1010 | Quiere el reporte diario | Normal, y la respuesta correcta es que no se puede |

Los dos que importan son **TCK-1004** y **TCK-1005**, por razones opuestas. En el primero no
hay respuesta y el agente tiene que admitirlo en vez de improvisar una plausible. En el
segundo hay una respuesta perfecta y el agente igual tiene que ceder el ticket, porque
acertar el diagnóstico y perder la cuenta sigue siendo perder la cuenta.

## Las cuatro métricas

- **Acierto de categoría** — la más fácil y la menos informativa. Está para detectar que el
  clasificador se rompió, no para medir calidad.
- **Acierto de escalado** — **la que importa.** Es la única que castiga al agente que
  siempre responde algo. `run.ts` sale con código 1 si esta métrica no da 100%, así que es
  la que puede frenar un merge.
- **Tasa de evidencia citada** — qué proporción de los casos citó al menos una fuente. Un
  número alto con escalado bajo significa que el agente está citando cualquier cosa para
  poder responder; las dos se leen juntas o no se leen.
- **Fallos de schema por caso** — cuántas veces hubo que devolverle los errores al modelo
  antes de obtener una salida válida. Sube cuando alguien toca `compose.md` o el schema.

La columna `regla` dice cuál de las seis reglas de `decidirEscalado` disparó. Es lo que
convierte un fallo en algo diagnosticable: no es lo mismo que un caso escale por
`sin-evidencia` que por `confianza-baja`.

## Qué NO mide este eval

- **La calidad de la respuesta al cliente.** Ningún número de acá dice si el texto está bien
  escrito. Eso se lee a mano, con `npm run demo`.
- **Costo y latencia.** Se ven en la traza de cada corrida, no se agregan acá.
- **Estabilidad entre corridas.** Es un eval de diez casos contra un modelo no determinista:
  una diferencia de un caso entre dos corridas es ruido, no una regresión.

## Por qué corre secuencial

Vale la pena contarlo porque es el error que más caro salió construyendo esto. La primera
versión corría tres casos en paralelo, y las métricas daban **60% de escalado y 30% de
evidencia citada**. Los mismos casos, uno por vez y con el mismo código, dan **100% y 80%**.

No había ninguna regresión del agente: bajo concurrencia los límites de tasa devuelven
errores de API que llegan como resultados válidos con `is_error: true`, y el agente terminaba
respondiendo con menos fuentes de las que tenía. El eval estaba midiendo la infraestructura.

Dos cosas quedaron de eso: `correr()` en el orquestador ahora distingue un error de API de
una respuesta del modelo, y este archivo corre secuencial por defecto. **Un eval más rápido
que miente es peor que no tener eval.**

## Agregar un caso

El caso nuevo tiene que probar algo que ninguno de los diez pruebe. Si podés describirlo
como "otro de facturación", no hace falta. Si podés describirlo como "uno donde la KB y el
changelog se contradicen", va.

Y el `esperado` se escribe **antes** de correrlo. Ajustar la expectativa después de ver el
resultado convierte el eval en un espejo: siempre pasa y no mide nada.
