# Tareas diarias simples

La bandeja de tareas diarias reúne el trabajo que el equipo debe ejecutar durante un turno sin obligarlo a recorrer cada ficha de residente.

## Qué aparece en la bandeja

- actividades vigentes del plan de cuidado;
- medicamentos programados y validaciones pendientes;
- residentes que requieren registro de signos vitales;
- seguimientos clínicos programados para el turno.

Los registros se generan de forma idempotente: actualizar la pantalla no duplica tareas. Los pendientes de turnos anteriores continúan visibles hasta que se resuelvan, omitan o reprogramen.

## Flujo de uso

1. Confirmar fecha y turno.
2. Abrir `Por hacer`, que es la vista predeterminada.
3. Atender la primera tarea de la lista; el orden prioriza atrasos, urgencia y hora.
4. Usar la acción principal de cada tipo: `Marcar hecha`, `Administrar`, `Registrar`, `Validar` o `Resolver`.
5. Abrir `Otra acción` sólo para reprogramar o registrar una omisión.
6. Consultar `Hechas` cuando sea necesario revisar el cierre del turno.

La búsqueda por residente o tarea se mantiene disponible. Se eliminaron los filtros cruzados por tipo y el tablero de nueve métricas porque generaban demasiadas combinaciones sin mejorar la ejecución diaria.

## Estados y trazabilidad

- **Por hacer:** incluye pendientes, reprogramaciones abiertas, validaciones y arrastres.
- **Hechas:** incluye actividades cumplidas, medicamentos administrados o validados, y omisiones registradas.
- **Todas:** vista de auditoría del turno.

Una omisión siempre exige motivo. La reprogramación registra el nuevo momento. Los medicamentos controlados conservan doble firma, y el mismo usuario no puede validar su propia administración. Las acciones continúan protegidas por permisos y funciones/RLS de Supabase.

## Uso por perfil

- **Cuidador o funcionario operativo:** ve una única cola priorizada y sólo las acciones permitidas.
- **TENS o personal autorizado:** registra medicamentos y signos según permisos.
- **Validador:** confirma medicamentos controlados administrados por otra persona.
- **Administrador o director técnico:** dispone de la misma vista operativa y puede revisar tareas cerradas y trazabilidad.

## Diseño responsive y accesibilidad

- Tres vistas táctiles ocupan todo el ancho disponible.
- Los controles principales tienen una altura mínima de 44 px.
- En móvil, cada tarea muestra primero identidad, hora y acción principal; las excepciones quedan agrupadas.
- En escritorio, información y acciones se alinean horizontalmente sin cambiar el orden operativo.
- Los estados de carga, vacío, error y falta de permisos entregan mensajes explícitos.

## Decisiones técnicas

- Se conservaron los servicios canónicos de planes de cuidado, eMAR, signos vitales y observaciones.
- La simplificación es de orquestación e interfaz; no se duplicó lógica clínica.
- Las URLs con el filtro histórico `vencidas` se normalizan a `Por hacer`, donde los atrasos aparecen primero.
- Se corrigió el cálculo de progreso: las tareas reprogramadas abiertas ya forman parte de los pendientes y no deben descontarse dos veces.
- Fecha, turno y búsqueda continúan representados en la URL para permitir enlaces y recuperación de contexto.

## Verificación funcional mínima

- carga y regeneración idempotente;
- tarea cumplida, omitida y reprogramada;
- medicamento administrado, omitido y controlado por validar;
- signos vitales con validación de rangos;
- seguimiento resuelto o continuado;
- consulta de tareas cerradas;
- comportamiento de solo lectura cuando faltan permisos;
- visualización móvil y de escritorio.
