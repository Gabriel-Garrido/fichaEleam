# Cobranza de residentes

## Alcance

`/cobranza` administra mensualidades y otros cobros internos de cada ELEAM. Permite registrar abonos parciales, adjuntar un documento emitido externamente, enviar una confirmación al contacto de pagos y consultar el historial.

No procesa dinero, no se integra con MercadoPago y no emite boletas ni facturas. El PDF de FichaEleam se identifica como **confirmación administrativa no tributaria**. La tabla comercial `public.pagos` y `/superadmin/pagos` no participan en este flujo.

## Flujo

1. Un usuario autorizado crea una mensualidad o un cobro de otro tipo y define el contacto que recibirá las comunicaciones.
   Si marca “Crear esta mensualidad cada mes”, se guarda el monto habitual, el concepto y el día de vencimiento. Al abrir el módulo se generan los períodos faltantes —con un máximo de 24 meses, incluido el actual— mientras el residente siga activo u hospitalizado. Un cobro mensual único no modifica ni pausa la configuración recurrente.
2. Al recibir un abono, registra monto, fecha, medio, referencia y observación.
3. El formulario de pago carga automáticamente el contacto guardado. El usuario puede confirmarlo o corregirlo; los cambios quedan disponibles para los próximos pagos y reenvíos.
4. Adjunta una boleta, factura o comprobante externo en PDF, JPG o PNG, con un máximo de 5 MB.
5. PostgreSQL bloquea el cobro, verifica el saldo y deja el pago pendiente mientras se carga el archivo privado.
6. La Edge Function descarga el archivo, valida su tamaño y firma binaria real y solo entonces confirma el pago. El MIME declarado por el navegador no se considera suficiente.
7. Si el usuario puede enviar correos, la misma función genera una confirmación PDF no tributaria y envía ambos documentos. Si solo puede registrar, el pago queda disponible para que otro usuario autorizado lo envíe desde el historial.
8. Cada intento queda visible como enviado o fallido y puede reintentarse.

Los registros financieros no se eliminan. Los errores se corrigen mediante anulación, seleccionando una causa y explicando qué ocurrió. El historial muestra el motivo completo; las anulaciones automáticas se identifican expresamente como acciones del sistema. Los pagos parciales disminuyen el saldo; un cobro se considera pagado cuando sus abonos vigentes alcanzan el total. Anular una mensualidad no hace que ese mismo período vuelva a generarse.

Un cobro con saldo pendiente después de su vencimiento permite enviar un recordatorio al contacto de pagos. El correo reúne todos los cobros vencidos del residente y muestra el total pendiente. PostgreSQL garantiza como máximo un recordatorio exitoso por residente y mes, incluso ante solicitudes simultáneas.

La pantalla muestra hasta 40 resultados por bloque y permite cargar más progresivamente. La búsqueda usa debounce, los cálculos de saldos y relaciones se indexan en una sola pasada y solo se renderiza el bloque visible. El snapshot recupera únicamente el último estado de correo por pago y los recordatorios del mes vigente, evitando transferir intentos históricos redundantes. Los filtros responsive permiten ordenar cobros por prioridad, vencimiento o residente y acotar el historial por estado de pago, correo o un rango inclusivo de fechas.

Las mensualidades automáticas tienen búsqueda propia y muestran 30 resultados por bloque. Se pueden editar, pausar, reactivar o eliminar del listado. Eliminar una configuración detiene definitivamente sus futuros cobros, pero conserva todos los cobros y pagos ya creados. Al reactivar una mensualidad pausada, la generación comienza en el mes vigente y no crea cobros por los meses en que estuvo pausada.

## Guía rápida de uso

### Crear un cobro

1. Presiona **Crear cobro**.
2. Busca y selecciona al residente. Con más de 20 residentes aparece un buscador y la lista limita los resultados visibles para mantener el formulario rápido.
3. Elige **Mensualidad** u **Otro cobro**, completa el monto, concepto y vencimiento.
4. Para una mensualidad, decide si debe repetirse cada mes.
5. Completa el contacto de pagos. Si ya existe uno para el residente, se carga automáticamente.
6. Revisa los datos y crea el cobro.

### Registrar un pago

1. Busca el cobro pendiente y presiona **Registrar pago**.
2. Confirma monto, fecha, medio de pago, referencia y observación.
3. Adjunta la boleta, factura u otro respaldo tributario en PDF, JPG o PNG, con un máximo de 5 MB.
4. Revisa el contacto autocompletado. Puedes corregirlo; el cambio quedará guardado para los próximos pagos y reenvíos.
5. Finaliza el registro. Si tienes permiso de envío, el sistema remite el correo inmediatamente.

### Revisar el historial

En **Historial de pagos** puedes buscar por residente, concepto o referencia y combinar los siguientes filtros:

- estado del pago o del correo;
- fecha **Desde**;
- fecha **Hasta**.

El rango es inclusivo: un pago realizado exactamente en cualquiera de las fechas límite se muestra. Puedes usar solo una fecha para consultar todo lo anterior o posterior. **Limpiar todo** restablece la búsqueda y los filtros.

### Resolver casos especiales

- **Pago incorrecto:** anúlalo, selecciona la causa y explica qué ocurrió. El registro no desaparece.
- **Cobro vencido:** envía un recordatorio; solo puede enviarse uno exitoso por residente durante el mes.
- **Mensualidad temporalmente suspendida:** usa **Pausar**.
- **Residente egresado, fallecido u otro término definitivo:** usa **Eliminar** en Mensualidades. Se detienen los cobros futuros, pero el historial permanece.

## Modelo de datos

- `resident_payment_contacts`: un contacto de pagos vigente por residente.
- `resident_billing_profiles`: configuración de la mensualidad recurrente.
- `resident_charges`: mensualidades y otros cobros.
- `resident_payments`: abonos asociados a un cobro.
- `resident_payment_deliveries`: resultado e identidad del destinatario de cada envío.
- `resident_payment_reminders`: recordatorios mensuales de morosidad, destinatario y monto informado.
- `resident_payment_audit`: creación, actualización, adjuntos, envíos y anulaciones.
- bucket privado `pagos-residentes`: documentos externos, aislados por ELEAM y pago.

Los estados intermedios `pendiente_documento` reservan el saldo mientras se carga el archivo. Los registros incompletos expiran automáticamente después de una hora para no bloquear futuros abonos.
Cada cobro admite como máximo tres registros incompletos simultáneos, lo que limita acumulaciones accidentales o abusivas sin impedir pagos concurrentes legítimos.

## Permisos

| Permiso | Capacidad |
| --- | --- |
| `ver_pagos_residentes` | Abrir la feature, ver cobros, pagos y documentos. |
| `registrar_pagos_residentes` | Crear cobros, guardar el contacto y registrar abonos. |
| `enviar_comprobantes_pagos` | Enviar comprobantes y recordatorios de pagos vencidos. |
| `anular_pagos_residentes` | Anular cobros o pagos con motivo obligatorio. |

`admin_eleam` dispone de las cuatro capacidades. Los funcionarios parten sin acceso salvo asignación explícita. En el wizard de personal, la función administrativa propone ver, registrar y enviar, pero no anular.

La protección se aplica en cuatro capas: navegación, ruta, RPC y RLS/Storage. Un funcionario sin permisos no puede recuperar los datos usando directamente la API de Supabase.

## Correo y configuración

La Edge Function `send-resident-payment-receipt` usa `RESEND_API_KEY` y el remitente opcional `RESEND_FROM_EMAIL`. El mensaje incluye:

- confirmación PDF generada por FichaEleam;
- documento externo original;
- residente, concepto, monto, fecha y establecimiento;
- datos administrativos del pago y canales habituales para resolver dudas.

El archivo se valida por tamaño, MIME y firma binaria antes del envío. El correo nunca incorpora antecedentes clínicos ni el RUT del residente.

Para evitar envíos duplicados o abuso del proveedor, cada pago tiene una espera mínima de 30 segundos entre intentos y un máximo de 10 intentos por hora. Los recordatorios de morosidad se limitan a uno por residente y mes mediante una restricción en PostgreSQL, no solo en la interfaz. Si el proveedor rechaza el correo, la reserva se libera para permitir otro intento. La finalización es idempotente: una pérdida de conexión después de confirmar el archivo no crea un segundo abono.

El PDF reemplaza caracteres que la fuente estándar no puede representar y ajusta textos largos en varias líneas. Esto evita que nombres, conceptos u observaciones con caracteres especiales interrumpan el envío.

## Accesibilidad y responsive

- Controles táctiles de al menos 44 px y acciones apiladas en pantallas pequeñas.
- Formularios de una columna en móvil y dos columnas cuando hay espacio.
- Pestañas con roles ARIA, filtros con etiqueta accesible y progreso de pago anunciado a lectores de pantalla.
- Textos y montos largos permiten quiebre de línea sin generar scroll horizontal.
- Modales con bloqueo de cierre mientras una operación financiera está en curso.

## Despliegue

1. Aplicar `supabase_schema.sql` sobre la base vacía.
2. Configurar `RESEND_API_KEY` y, si corresponde, `RESEND_FROM_EMAIL`.
3. Desplegar `send-resident-payment-receipt` con verificación JWT habilitada.
4. Ejecutar `npm run verify`.

La Edge Function debe desplegarse junto con el esquema: el RPC directo que asociaba documentos fue eliminado deliberadamente para que ningún cliente pueda omitir la validación binaria del servidor.
