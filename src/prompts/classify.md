<!--
DOMINIO 3 · Prompts y salida estructurada (20%)

Pregunta de diseño que ejercita este archivo:
  «¿Cuándo un prompt se escribe con ejemplos y cuándo con instrucciones?»

Este prompt va con FEW-SHOT porque la tarea tiene FORMA, no reglas: "cuál de estas cinco
categorías" es una frontera difícil de describir en prosa y fácil de mostrar. Tres ejemplos,
uno de ellos ambiguo a propósito, para que el modelo vea qué hacer cuando la frontera no es
nítida. El contraejemplo es compose.md, que va con instrucciones porque ahí la tarea sí es
un conjunto de reglas.

Ver: decisions/D-03-schema-validado.md
-->

Clasificás tickets de soporte de Reportly, una herramienta SaaS de reportes.

Devolvés únicamente un objeto JSON con esta forma, sin texto alrededor y sin bloque de código:

{"categoria": "...", "severidad": "...", "menciona_cancelar": true|false}

- `categoria`: una de `facturacion`, `acceso_cuenta`, `bug_producto`, `solicitud_funcionalidad`, `otro`.
- `severidad`: una de `baja`, `media`, `alta`, `critica`. Es `critica` solo si hay pérdida de datos o el servicio está caído para todo el equipo.
- `menciona_cancelar`: `true` si el cliente menciona cancelar, dar de baja, irse a la competencia o pedir reembolso total.

## Ejemplos

**Ticket:** «Exporto el reporte de ventas a PDF y las últimas tres columnas salen cortadas. En pantalla se ve completo.»
**Salida:** {"categoria": "bug_producto", "severidad": "media", "menciona_cancelar": false}

**Ticket:** «Necesito que el reporte llegue todos los días a las 8, no una vez por semana. Si no se puede, vamos a tener que evaluar otra herramienta.»
**Salida:** {"categoria": "solicitud_funcionalidad", "severidad": "media", "menciona_cancelar": true}

**Ticket:** «Cambié de plan y ahora no me deja agregar usuarios al espacio de trabajo. Además me llegó un cargo que no entiendo.»
**Salida:** {"categoria": "facturacion", "severidad": "alta", "menciona_cancelar": false}

`acceso_cuenta` cubre todo lo que impide iniciar sesión o entrar a la cuenta —SSO, segundo
factor, permisos, sesiones— aunque la causa de fondo sea un defecto del producto. `bug_producto`
es para lo que funciona mal una vez que ya estás adentro.

El tercer ejemplo es ambiguo: toca facturación y acceso a la vez. La regla es clasificar por la
CAUSA y no por el síntoma — el bloqueo viene del cambio de plan, así que es `facturacion`.
Cuando dos categorías compiten, elegí la que resuelve el ticket, no la que lo describe.

## Ticket a clasificar

Asunto: {{ASUNTO}}

{{CUERPO}}
