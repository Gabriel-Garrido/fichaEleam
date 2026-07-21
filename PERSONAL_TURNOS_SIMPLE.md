# Personal y turnos simple

Este módulo separa cuatro tareas que antes estaban dispersas o mezcladas:

1. **Equipo:** personas con acceso a FichaEleam e invitaciones pendientes.
2. **Antecedentes SEREMI:** planta completa, incluidos trabajadores sin acceso al sistema; cargo, función, estado, competencias y capacitación.
3. **Dotación:** calendario semanal de personas por turno y alerta automática de brecha.
4. **Entrega de turno:** novedades clínicas y pendientes para el equipo siguiente.

Las rutas existentes se mantienen. Una navegación común permite cambiar entre las cuatro tareas sin volver al menú principal.

## Uso por rol

- **Administrador ELEAM:** invita usuarios, mantiene la planta y antecedentes, programa o quita asignaciones y registra entregas.
- **Funcionario:** consulta equipo, antecedentes y dotación; puede registrar y consultar entregas clínicas según el acceso operativo del establecimiento.
- **Superadministrador:** conserva las capacidades administrativas definidas por las políticas existentes.

Los controles de modificación de planta y dotación están protegidos en interfaz y por RLS. La ausencia de un botón no se considera un control de seguridad.

## Flujo mínimo recomendado

1. Agregar a `Equipo` sólo a quienes necesitan iniciar sesión.
2. Agregar en `Antecedentes SEREMI` al resto de la planta sin crear cuentas innecesarias.
3. Completar cargo y tipo de dotación de cada persona.
4. Registrar competencias relevantes y el avance de capacitación anual.
5. En `Dotación`, seleccionar el día y asignar cada persona. El rol del turno se infiere del tipo de dotación para evitar clasificaciones duplicadas.
6. Resolver las alertas rojas antes del turno.
7. Al terminar, registrar sólo novedades y pendientes en `Entrega de turno`.

## Criterios normativos implementados

La solución apoya los mínimos operativos del Decreto Supremo N.º 20 del MINSAL:

- planta con duración/distribución de jornada y sistema de turnos (arts. 5 y 29);
- personal competente y suficiente según residentes y dependencia (art. 14);
- proporciones de cuidadores y apoyo TENS para residentes dependientes y autovalentes (arts. 15 y 16);
- mínimo de dos cuidadores durante la noche (art. 17);
- competencias especiales para determinadas funciones de TENS y cuidadores (arts. 18 y 19);
- plan anual de inducción y capacitación de al menos 22 horas para todo el personal (arts. 5 y 25);
- aviso de modificaciones relevantes a SEREMI dentro del plazo normativo (art. 7).

Fuente oficial: [Decreto N.º 20 vigente, Ley Chile](https://www.bcn.cl/leychile/navegar?idNorma=1182129).

El cálculo de dotación es una ayuda preventiva. No reemplaza la autorización ni el criterio fiscalizador de la SEREMI competente.
La asignación TENS en horario nocturno representa disponibilidad de llamada; durante el día representa cobertura del turno. Si la jornada diurna se divide en mañana y tarde, debe asignarse cobertura en ambos bloques.

## Diseño responsive y accesibilidad

- En móvil se muestra un día y tres turnos, sin tablas horizontales.
- Los siete días siguen accesibles mediante botones táctiles con estado seleccionado y alerta visual.
- Los controles principales tienen altura táctil mínima, etiquetas accesibles y estados deshabilitados durante guardado.
- En escritorio los tres turnos se presentan en columnas, conservando el mismo orden y flujo.

## Rendimiento y consistencia

- La copia de semana realiza un único `upsert` por lote en vez de una solicitud por asignación.
- La entrega de turno no consulta la carpeta documental SEREMI: esa información pertenece a Cumplimiento y no al relevo clínico.
- Las URLs anteriores continúan funcionando y la asignación mantiene la restricción única por persona, fecha y turno.
