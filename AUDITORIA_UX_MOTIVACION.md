# Auditoría UX y motivación — versión simplificada

## Resumen

FichaEleam fue reorganizada para disminuir carga cognitiva sin perder trazabilidad clínica ni valor reglamentario. El cambio principal es pasar de una navegación por módulos técnicos a cinco áreas reconocibles por el usuario.

```text
Inicio → Establecimiento → Residentes → Personal → Cumplimiento SEREMI
```

La motivación se trabaja mediante avance real, claridad y cierre de tareas. No se recomienda gamificación competitiva, puntos, rachas, confeti ni recompensas que trivialicen el contexto clínico.

## Principios UX

1. **Mostrar el próximo paso**, no todas las posibilidades.
2. **Progreso basado en datos reales**, no checklists artificiales.
3. **Una ficha por residente**, evitando módulos paralelos.
4. **Jerarquía progresiva**: lo frecuente visible; lo excepcional dentro de detalles.
5. **Confirmaciones breves y sobrias** después de acciones correctas.
6. **Alertas accionables**, con explicación y destino.
7. **Sin doble registro** entre operación y cumplimiento.
8. **Rendimiento como parte de la experiencia**.

## Cambios implementados

- Navegación principal reducida a cinco áreas.
- Centros de Establecimiento, Personal y Cumplimiento con tarjetas de destino.
- Ingreso de residentes reducido a identificación, clínica esencial e ingreso.
- Ficha del residente consolidada como punto central.
- Personal separado en equipo y dotación.
- Requisitos, protocolos, emergencias y reclamos reunidos bajo Cumplimiento.
- Portal familiar y visitas retirados de las rutas activas.
- Publicación familiar eliminada de observaciones, cuidados y medicamentos.
- Onboarding modal y checklist inicial retirados.
- Ayuda contextual conservada mediante `FeatureCoach`.
- Roles visibles reducidos a administrador y funcionario, además del superadmin de plataforma.
- Catálogo de features reducido a áreas, manteniendo permisos clínicos específicos.

## Revisión por área

### 1. Inicio

**Objetivo:** orientar rápidamente.

Debe mostrar:

- alertas clínicas y operativas prioritarias;
- tareas o seguimientos pendientes;
- brechas de cumplimiento;
- accesos rápidos a cuidados, medicamentos y turno;
- una sola recomendación principal cuando el ELEAM está vacío.

Evitar:

- métricas sin acción;
- tarjetas repetidas;
- tutoriales que bloqueen;
- porcentajes decorativos sin fuente explicada.

Mejoras futuras:

- orden dinámico según rol y turno;
- agrupación de alertas repetidas;
- botón “Resolver siguiente” con destino contextual;
- comparación semanal limitada a indicadores operativos útiles.

### 2. Establecimiento

**Objetivo:** representar capacidad e infraestructura.

Debe mostrar:

- habitaciones y camas;
- disponibilidad y mantenimiento;
- ocupación actual;
- acceso a evidencia documental del inmueble.

Evitar:

- duplicar documentos SEREMI dentro del inventario de camas;
- exigir nombres y códigos redundantes;
- mezclar mantenimiento físico con estados clínicos.

Mejoras futuras:

- creación rápida de varias camas;
- plano simple opcional por piso;
- filtro “requiere acción”;
- sugerencias para resolver inconsistencias de capacidad.

### 3. Residentes

**Objetivo:** ofrecer una ficha integral y rápida.

Debe mostrar primero:

- identidad y ubicación;
- alertas, alergias y dependencia;
- pendientes del turno;
- accesos a salud, cuidados, medicamentos, ingreso DS20 y trazabilidad.

Evitar:

- pedir toda la historia durante el alta;
- repetir información entre pestañas;
- usar el color como única señal clínica;
- formularios extensos sin secciones.

Mejoras futuras:

- encabezado fijo con alertas críticas;
- acción rápida adaptable al contexto;
- resumen imprimible clínico-operativo;
- ingreso guiado DS20 por pendientes, sin bloquear el trabajo;
- importación con previsualización y corrección en línea.

### 4. Personal

**Objetivo:** mantener acceso, dotación y competencias.

Debe mostrar:

- directorio de funcionarios;
- invitaciones pendientes;
- nómina operativa;
- vencimientos de competencias;
- cobertura por turno.

Evitar:

- matrices de permisos visibles permanentemente;
- formularios de usuario con campos laborales no necesarios;
- duplicar `profiles` y `staff_members` sin una relación clara en UI;
- mezclar CRM con personal del ELEAM.

Mejoras futuras:

- unificar visualmente cuenta y ficha laboral;
- plantillas de cargo simples;
- renovación de certificados desde una alerta;
- programación semanal por arrastre solo si mantiene accesibilidad móvil.

### 5. Cumplimiento SEREMI

**Objetivo:** transformar obligaciones en acciones concretas.

Debe mostrar:

- requisitos pendientes y vencidos;
- evidencia vigente;
- responsable y próxima acción;
- protocolos y brechas;
- emergencias, simulacros y reclamos;
- carpeta exportable.

Evitar:

- presentar el Decreto completo antes de la tarea;
- obligar a subir un documento si existe evidencia operacional válida;
- múltiples porcentajes para el mismo avance;
- estados técnicos sin explicación.

Mejoras futuras:

- vista “Qué falta para estar preparado”;
- recomendación del medio verificador adecuado;
- relación visible entre registro operacional y requisito;
- exportación por fiscalización o ámbito;
- historial de revisión con comparación de cambios.

## Microinteracciones recomendadas

Estas señales producen satisfacción sin afectar rendimiento:

- cambio inmediato del estado y contador al guardar;
- toast breve con verbo y resultado: “Residente creado”, “Tarea completada”;
- check animado con CSS y duración menor a 250 ms;
- barra de progreso solo cuando refleja cumplimiento real;
- estado vacío con una acción principal;
- confirmación que indique qué quedó registrado y cuál es el siguiente paso;
- skeletons estables para evitar saltos de diseño.

No usar:

- sonidos automáticos;
- confeti;
- rachas de uso;
- rankings entre funcionarios;
- badges por cantidad de registros;
- animaciones continuas.

## Simplificación de campos

Un campo debe permanecer visible si:

- es obligatorio por norma o contrato;
- cambia una decisión clínica u operacional;
- se utiliza frecuentemente;
- alimenta una alerta, cálculo o documento.

Debe moverse a “Opcional” si se usa ocasionalmente y no bloquea el flujo. Debe retirarse si duplica otro dato, no tiene consumidor o solo existe por una implementación anterior.

## Métricas UX sugeridas

Medir sin almacenar datos clínicos adicionales:

- tiempo hasta crear el primer residente;
- porcentaje que configura al menos una habitación;
- tiempo hasta completar la primera tarea de cuidado;
- porcentaje de administraciones registradas a tiempo;
- requisitos pendientes que pasan a vigente;
- errores por formulario y campo;
- abandono de importaciones;
- pantallas con mayor tiempo de carga.

No interpretar cantidad de clics como éxito. La métrica principal debe ser una tarea válida completada.

## Prioridades futuras

### Alta

1. Eliminar código y contratos internos residuales del portal familiar cuando el esquema se regenere definitivamente.
2. Unificar `profiles` y `staff_members` en la experiencia de Personal.
3. Reducir el tamaño de la ficha de residente separando componentes grandes.
4. Crear una vista de brechas SEREMI ordenada por criticidad y esfuerzo.
5. Instrumentar errores de formularios y tiempos de carga.

### Media

1. Acciones rápidas por turno y rol.
2. Mejor importación Excel con edición previa.
3. Atajos de teclado en escritorio.
4. Exportaciones configurables.
5. Recordatorios de vencimiento agrupados.

### Baja

1. Personalización visual por ELEAM.
2. Plano de habitaciones.
3. Plantillas adicionales de cuidado.
4. Panel comparativo histórico avanzado.

## Criterio de aceptación UX

Una modificación se considera positiva cuando:

- reduce decisiones antes de completar la tarea;
- mantiene o mejora la trazabilidad;
- no crea otro módulo principal;
- funciona en móvil;
- no aumenta el bundle inicial de las rutas públicas;
- ofrece estado de carga, error y éxito;
- conserva accesibilidad y reducción de movimiento;
- supera `npm run verify`.
