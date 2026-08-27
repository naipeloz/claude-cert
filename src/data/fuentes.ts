/**
 * DOMINIO 4 · Herramientas y MCP (18%)
 *
 * Pregunta de diseño que ejercita este archivo:
 *   «¿Qué le das de comer a las tools, y de dónde sale?»
 *
 * Tres arrays. Sin base de datos, sin ORM, sin capa de repositorio: reemplazar esto por
 * Postgres cambia este archivo y ningún otro, así que la abstracción "por si mañana" no
 * compra nada. Las tres fuentes son coherentes entre sí a propósito — el bug de v4.2.0
 * aparece en la KB, en el changelog y en un ticket previo — porque el agente tiene que
 * poder llegar a la misma conclusión por tres caminos, que es lo que se demuestra en vivo.
 *
 * Ver: decisions/D-06-mcp-in-process.md
 */

export type ArticuloKb = { id: string; titulo: string; cuerpo: string };
export type EntradaChangelog = { version: string; fecha: string; tipo: 'fix' | 'feature' | 'breaking'; texto: string };
export type TicketPrevio = { id: string; asunto: string; cuerpo: string; resolucion: string };

/** Producto ficticio: Reportly, una herramienta SaaS de reportes. */
export const kb: ArticuloKb[] = [
  {
    id: 'KB-002',
    titulo: 'Cómo cambiar de plan y cómo se prorratea el cobro',
    cuerpo:
      'Al cambiar de plan a mitad de ciclo, Reportly cobra la diferencia prorrateada por los días restantes. El cargo aparece como una línea aparte en la siguiente factura, con el detalle "Ajuste por cambio de plan". Bajar de plan no genera reembolso: el crédito queda a favor y se descuenta del siguiente ciclo. El límite de usuarios del espacio de trabajo se aplica recién cuando el pago del nuevo plan se acredita, así que entre el cambio y la acreditación sigue rigiendo el límite del plan anterior.',
  },
  {
    id: 'KB-005',
    titulo: 'Factura duplicada: qué la causa y cómo se corrige',
    cuerpo:
      'Si el método de pago se reintenta después de un rechazo transitorio, el sistema puede emitir dos facturas por el mismo período. La segunda se anula automáticamente en 24 horas. Si pasadas 24 horas sigue visible, hay que anularla desde Facturación > Historial > Anular, y el reembolso llega en 5 a 10 días hábiles.',
  },
  {
    id: 'KB-007',
    titulo: 'Restablecer el segundo factor (2FA) sin acceso al dispositivo',
    cuerpo:
      'Un usuario que perdió el dispositivo con el segundo factor no puede restablecerlo solo. Un administrador del espacio de trabajo lo hace desde Equipo > Usuarios > Restablecer 2FA. Si el usuario es el único administrador, el restablecimiento requiere verificación de identidad por parte de soporte y no puede automatizarse.',
  },
  {
    id: 'KB-009',
    titulo: 'Inicio de sesión con SSO (SAML): errores frecuentes',
    cuerpo:
      'El error "SSO: assertion sin atributo email" significa que el proveedor de identidad no está enviando el atributo email en la aserción SAML. Se corrige en la configuración del proveedor, no en Reportly. El certificado del proveedor vence cada 12 meses; si venció, todos los inicios de sesión fallan a la vez.',
  },
  {
    id: 'KB-014',
    titulo: 'Exportar un reporte a PDF',
    cuerpo:
      'Reportly exporta cualquier reporte a PDF desde el botón Exportar. Los reportes con muchas columnas se ajustan al ancho de la página. Si una tabla ancha aparece cortada en el PDF, revisá primero la versión del producto: hubo un defecto conocido en ese ajuste. Para tablas de más de 20 columnas, la recomendación es exportar a CSV.',
  },
  {
    id: 'KB-018',
    titulo: 'Reportes programados: frecuencias disponibles',
    cuerpo:
      'Un reporte programado se envía por email a una lista de destinatarios. Las frecuencias disponibles son semanal y mensual. La frecuencia diaria es el pedido más votado y todavía no está disponible; no hay forma de simularla creando varios reportes semanales, porque el programador limita a un envío por reporte y semana.',
  },
  {
    id: 'KB-021',
    titulo: 'Límites de la API de exportación',
    cuerpo:
      'La API de exportación acepta 60 pedidos por minuto por espacio de trabajo. Al pasarse, devuelve 429 con la cabecera Retry-After. Un 5xx sostenido no es límite de tasa: indica un incidente y hay que reportarlo. Los pedidos que devuelven 5xx no consumen cupo.',
  },
  {
    id: 'KB-025',
    titulo: 'Zonas horarias en los reportes programados',
    cuerpo:
      'La hora de envío de un reporte programado usa la zona horaria del espacio de trabajo, no la del usuario que lo creó. Cambiar la zona del espacio reprograma todos los envíos existentes. Un envío que parece llegar con horas de diferencia casi siempre es una zona horaria mal configurada, no un retraso.',
  },
];

export const changelog: EntradaChangelog[] = [
  {
    version: 'v4.1.3',
    fecha: '2025-11-04',
    tipo: 'fix',
    texto:
      'Corregida una pérdida de envíos en reportes programados: si el envío coincidía con el reinicio nocturno del programador, el reporte se marcaba como enviado sin haberse enviado.',
  },
  {
    version: 'v4.2.0',
    fecha: '2025-12-09',
    tipo: 'feature',
    texto:
      'Nuevo motor de exportación a PDF, más rápido y con mejor tipografía. Introdujo un defecto en el ajuste de ancho: las tablas de más de 12 columnas salen cortadas del lado derecho.',
  },
  {
    version: 'v4.2.1',
    fecha: '2025-12-18',
    tipo: 'fix',
    texto:
      'Corregido el corte de tablas anchas en la exportación a PDF introducido en v4.2.0. Las tablas de más de 12 columnas vuelven a ajustarse al ancho de la página.',
  },
  {
    version: 'v4.2.4',
    fecha: '2026-02-02',
    tipo: 'fix',
    texto:
      'Corregido el error "SSO: assertion sin atributo email" cuando el proveedor de identidad enviaba el email en un atributo con mayúsculas. Ahora la comparación no distingue mayúsculas.',
  },
  {
    version: 'v4.3.0',
    fecha: '2026-04-21',
    tipo: 'feature',
    texto:
      'Los reportes programados aceptan frecuencia mensual además de semanal. La frecuencia diaria sigue sin estar disponible y no hay fecha comprometida.',
  },
  {
    version: 'v4.3.1',
    fecha: '2026-06-15',
    tipo: 'breaking',
    texto:
      'La API de exportación pasa de 120 a 60 pedidos por minuto por espacio de trabajo. Las integraciones que hacían más de 60 empiezan a recibir 429.',
  },
];

export const ticketsPrevios: TicketPrevio[] = [
  {
    id: 'TCK-0801',
    asunto: 'Me cobraron dos veces este mes',
    cuerpo: 'Veo dos facturas del mismo período en el historial. La tarjeta figura debitada una sola vez.',
    resolucion:
      'Factura duplicada por reintento de cobro. La segunda se anuló sola a las 19 horas. Se confirmó con el cliente que la tarjeta se debitó una vez.',
  },
  {
    id: 'TCK-0803',
    asunto: 'El PDF me corta la tabla',
    cuerpo: 'Exporto el reporte de ventas por región y el PDF corta las últimas columnas. En pantalla se ve completo.',
    resolucion:
      'Defecto conocido del motor de exportación de v4.2.0 con tablas de más de 12 columnas. Se corrigió en v4.2.1. Se le pidió al cliente actualizar y confirmó que quedó bien.',
  },
  {
    id: 'TCK-0804',
    asunto: 'Quiero recibir el reporte todos los días',
    cuerpo: 'Necesito que el reporte de ventas llegue cada mañana, no una vez por semana.',
    resolucion:
      'La frecuencia diaria no existe. Se registró el pedido y se ofreció como alternativa la API de exportación con un cron propio del lado del cliente.',
  },
  {
    id: 'TCK-0805',
    asunto: 'Perdí el celular y no puedo entrar',
    cuerpo: 'Tenía el segundo factor en el celular que perdí. Soy el único administrador de la cuenta.',
    resolucion:
      'Al ser único administrador no se pudo restablecer por autoservicio. Se hizo verificación de identidad por soporte y se restableció el 2FA a mano.',
  },
  {
    id: 'TCK-0806',
    asunto: 'Nadie del equipo puede iniciar sesión con SSO',
    cuerpo: 'Desde esta mañana todo el equipo recibe un error al entrar con SSO. Ayer funcionaba.',
    resolucion:
      'El certificado SAML del proveedor de identidad había vencido. Lo renovaron del lado del cliente y se restableció el acceso. No fue un incidente de Reportly.',
  },
  {
    id: 'TCK-0807',
    asunto: 'Mi integración empezó a recibir 429',
    cuerpo: 'El proceso que exporta reportes cada noche empezó a fallar con 429 sin que cambiáramos nada.',
    resolucion:
      'El límite de la API bajó de 120 a 60 pedidos por minuto en v4.3.1. Se ajustó el proceso del cliente para respetar Retry-After.',
  },
  {
    id: 'TCK-0808',
    asunto: 'El reporte programado llega a la hora equivocada',
    cuerpo: 'Configuré el envío a las 8 y llega a las 13. No es siempre la misma diferencia.',
    resolucion:
      'La zona horaria del espacio de trabajo estaba en UTC y el cliente esperaba hora local. Se corrigió la zona del espacio y los envíos se reprogramaron solos.',
  },
  {
    id: 'TCK-0802',
    asunto: 'Cambié de plan y no entiendo el cobro',
    cuerpo: 'Pasé al plan Business a mitad de mes y me llegó un cargo que no esperaba.',
    resolucion:
      'Era el ajuste prorrateado por los días restantes del ciclo. Se le mostró la línea "Ajuste por cambio de plan" en la factura y quedó conforme.',
  },
];
