export const COACHES = {
  dashboard: {
    icon: "home",
    eyebrow: "Inicio",
    title: "Tu día, en una pantalla",
    description: "Lo urgente primero: alertas clínicas, pendientes del turno y residentes a vigilar.",
    steps: [
      { title: "Mira las alertas", text: "Vencidos, medicamentos y eventos quedan resaltados arriba." },
      { title: "Entra al turno", text: "Un toque en Tareas o Medicamentos y ves lo de ahora." },
    ],
    benefit: "Empiezas el turno sabiendo qué hacer, sin revisar cuadernos.",
    roleOverrides: {
      admin_eleam: {
        title: "El pulso de tu ELEAM",
        description: "Ocupación, equipo, clínica y acreditación en un solo vistazo.",
        steps: [
          { title: "Lee los indicadores", text: "Residentes, alertas y vencimientos en tarjetas claras." },
          { title: "Actúa sobre lo crítico", text: "Cada alerta te lleva a resolverla en 1 click." },
        ],
        benefit: "Decides con datos al día y frenas los problemas antes de que escalen.",
      },
    },
  },

  turnos: {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Pasa el turno sin perder nada",
    description: "El historial de entregas y el armado del resumen para el siguiente equipo.",
    steps: [
      { title: "Crea una entrega", text: "El sistema junta medicamentos, tareas y signos por ti." },
      { title: "Comparte o imprime", text: "Queda firmada y disponible para el equipo entrante." },
    ],
    benefit: "Adiós a las hojas sueltas y las entregas verbales que se pierden.",
  },

  "turnos-nuevo": {
    icon: "shift",
    eyebrow: "Nueva entrega",
    title: "Arma la entrega en 3 minutos",
    description: "El turno llega precargado y organizado por residente. Solo agregas tus notas.",
    steps: [
      { title: "Revisa lo precargado", text: "Medicamentos, tareas y signos ya consolidados." },
      { title: "Anota pendientes", text: "Lo que el siguiente equipo debe ejecutar." },
    ],
    benefit: "Tu cierre de turno pasa de 20 minutos a 3, y queda trazado.",
  },

  "turnos-detalle": {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Detalle imprimible y trazado",
    description: "La entrega completa por residente, lista para consultar o imprimir.",
    steps: [
      { title: "Revisa por residente", text: "Lo que ocurrió con cada uno en el turno." },
      { title: "Imprime si lo necesitas", text: "Formato optimizado para papel A4." },
    ],
    benefit: "Resuelves dudas y auditas incidentes consultando entregas anteriores.",
  },

  "care-tasks": {
    icon: "tasks",
    eyebrow: "Tareas del turno",
    title: "Lo que toca hacer ahora",
    description: "Una bandeja con cuidados, signos, medicamentos y seguimientos del turno.",
    steps: [
      { title: "Filtra lo accionable", text: "Pendientes, vencidas o por validar." },
      { title: "Cierra en 1 click", text: "Cumplida, omitida o reprogramada, desde la misma fila." },
    ],
    benefit: "El equipo trabaja contra una lista clara. Nada se pierde.",
  },

  emar: {
    icon: "meds",
    eyebrow: "Medicamentos",
    title: "Administración segura, sin papeles",
    description: "El kardex del turno con dosis, vía y alertas de stock.",
    steps: [
      { title: "Filtra por turno", text: "Ves solo lo programado en ese horario." },
      { title: "Administra u omite", text: "Con lote y dosis reales, o motivo de omisión." },
      { title: "Doble firma si aplica", text: "Controlados esperan validación de un segundo usuario." },
    ],
    benefit: "Menos errores de medicación, con stock auditado y cada dosis trazada.",
  },

  residents: {
    icon: "residents",
    eyebrow: "Residentes",
    title: "Todas las fichas en un lugar",
    description: "Lista completa con estado, dependencia y ubicación de cada residente.",
    steps: [
      { title: "Busca al instante", text: "Por nombre o RUT, con tildes y mayúsculas." },
      { title: "Entra a la ficha", text: "Salud, contactos y planes con un click." },
    ],
    benefit: "Nadie pierde tiempo buscando carpetas físicas. Todo en segundos.",
  },

  "residents-new": {
    icon: "residents",
    eyebrow: "Nuevo residente",
    title: "Ingresa al residente sin dudas",
    description: "El formulario te guía: datos, familiar de contacto y clínica básica.",
    steps: [
      { title: "Completa lo obligatorio", text: "Nombre, RUT, nacimiento y familiar." },
      { title: "Agrega contexto clínico", text: "Diagnóstico, alergias y dependencia." },
      { title: "Asigna cama después", text: "Créalo y ve a Camas para ubicarlo." },
    ],
    benefit: "El ingreso queda validado y disponible al instante para el equipo.",
  },

  "residents-detail": {
    icon: "residents",
    eyebrow: "Ficha del residente",
    title: "Todo sobre tu residente",
    description: "Datos, salud, plan de cuidado, medicación y trazabilidad, juntos.",
    steps: [
      { title: "Navega las pestañas", text: "Clínica, signos, medicamentos, cuidado y bitácora." },
      { title: "Aplica escalas", text: "Barthel y Katz desde la pestaña de salud." },
    ],
    benefit: "Accedes al 360° del residente en segundos, sin planillas dispersas.",
  },

  "residents-edit": {
    icon: "residents",
    eyebrow: "Editar residente",
    title: "Actualiza cuando algo cambie",
    description: "Modifica datos, diagnósticos o estado. Todo queda trazado.",
    steps: [
      { title: "Edita lo que cambió", text: "El resto de la ficha se mantiene." },
      { title: "Marca egreso si aplica", text: "Con fecha y motivo del cambio de estado." },
    ],
    benefit: "La ficha siempre refleja la realidad actual, sin notas paralelas.",
  },

  beds: {
    icon: "beds",
    eyebrow: "Camas",
    title: "Ocupación clara en tiempo real",
    description: "Disponibles, ocupadas, reservadas o fuera de servicio, en una vista.",
    steps: [
      { title: "Mira el panorama", text: "Disponibles, ocupadas y en mantención arriba." },
      { title: "Asigna o transfiere", text: "Desde la misma cama, con validación automática." },
    ],
    benefit: "Coordinas la ocupación sin reuniones ni planillas paralelas.",
  },

  "vital-signs": {
    icon: "vitals",
    eyebrow: "Signos vitales",
    title: "Controles con alerta visual",
    description: "Historial por residente con rangos clínicos automáticos.",
    steps: [
      { title: "Lee los colores", text: "Verde normal, ámbar atención, rojo crítico." },
      { title: "Registra uno nuevo", text: "Con guía por parámetro y feedback en vivo." },
    ],
    benefit: "Detectas tendencias antes de que se vuelvan emergencias.",
  },

  "vital-signs-new": {
    icon: "vitals",
    eyebrow: "Nuevo control",
    title: "Registra con guía clínica",
    description: "Mientras escribes, el sistema te avisa si el valor está en rango.",
    steps: [
      { title: "Llena lo que mediste", text: "Lo demás queda en blanco, sin error." },
      { title: "Marca seguimiento", text: "Si es crítico, deja aviso para el próximo turno." },
    ],
    benefit: "Cada control queda con contexto clínico y alertas automáticas.",
  },

  observations: {
    icon: "observations",
    eyebrow: "Observaciones",
    title: "Novedades y seguimientos a mano",
    description: "Incidentes y novedades clínicas por residente, con filtros.",
    steps: [
      { title: "Filtra por tipo", text: "Caídas, curaciones, visitas médicas y más." },
      { title: "Crea una nueva", text: "Con tipos agrupados por categoría." },
    ],
    benefit: "El siguiente turno arranca con contexto completo, sin notas sueltas.",
  },

  "observations-new": {
    icon: "observations",
    eyebrow: "Nueva observación",
    title: "Documenta lo que ocurrió",
    description: "Tipo, descripción y acciones tomadas. Marca seguimiento si aplica.",
    steps: [
      { title: "Elige el tipo", text: "Clínica, cuidados, psicosocial u otras." },
      { title: "Activa seguimiento", text: "Define fecha y turno de revisión si hace falta." },
    ],
    benefit: "Tus observaciones se vuelven acciones rastreables, no notas perdidas.",
  },

  "adverse-events": {
    icon: "alert",
    eyebrow: "Eventos adversos",
    title: "Registro reglamentario serio",
    description: "Caídas, errores y lesiones con severidad, timeline y cierre.",
    steps: [
      { title: "Prioriza por severidad", text: "Leve, moderado, grave o crítico." },
      { title: "Cierra con conclusiones", text: "Solo personal autorizado." },
    ],
    benefit: "Mantienes trazabilidad reglamentaria con historial inmutable.",
  },

  "adverse-events-new": {
    icon: "alert",
    eyebrow: "Nuevo evento adverso",
    title: "Registra un evento crítico",
    description: "Clasifica, describe lo ocurrido y las acciones inmediatas.",
    steps: [
      { title: "Clasifica con precisión", text: "Categoría y severidad guían el seguimiento." },
      { title: "Define el cierre", text: "Marca seguimiento y fecha compromiso." },
    ],
    benefit: "Tienes el respaldo formal ante fiscalizaciones, sin reconstruir hechos.",
  },

  "adverse-events-detail": {
    icon: "alert",
    eyebrow: "Detalle del evento",
    title: "Timeline completo del evento",
    description: "Acciones, contactos, derivaciones y cierre en orden cronológico.",
    steps: [
      { title: "Agrega acciones", text: "Cada una se firma y queda en el timeline." },
      { title: "Cierra con conclusiones", text: "Cuando el caso está resuelto." },
    ],
    benefit: "Trabajas el caso con método clínico, sin perder el hilo entre turnos.",
  },

  "adverse-events-edit": {
    icon: "alert",
    eyebrow: "Editar evento adverso",
    title: "Ajusta datos del evento",
    description: "Severidad, descripción o seguimiento. Los cambios quedan auditados.",
    steps: [
      { title: "Edita lo necesario", text: "Severidad, descripción, fechas o responsables." },
      { title: "Justifica el cambio", text: "Agrega una acción al timeline si es relevante." },
    ],
    benefit: "Tus registros se mantienen precisos y auditables, sin duplicados.",
  },

  accreditation: {
    icon: "accreditation",
    eyebrow: "Carpeta SEREMI",
    title: "Carpeta SEREMI DS 20 al día",
    description: "La matriz DS 20 por artículos del Decreto N°20 con alertas de vencimiento.",
    steps: [
      { title: "Mira la evidencia vigente", text: "Porcentaje y pendientes por ámbito." },
      { title: "Entra a un ámbito", text: "Revisa requisitos y sube documentos." },
    ],
    benefit: "Tu carpeta lista el día de la fiscalización, sin folders perdidos.",
  },

  "accreditation-ambito": {
    icon: "accreditation",
    eyebrow: "Ámbito SEREMI",
    title: "Requisitos del ámbito",
    description: "Estado, vencimientos y filtros fiscalizables del ámbito.",
    steps: [
      { title: "Filtra por estado", text: "Pendiente, vigente, no cumple o vencido." },
      { title: "Entra al requisito", text: "Para ver evidencias y subir documentos." },
    ],
    benefit: "Priorizas de un vistazo qué necesita acción inmediata.",
  },

  "accreditation-requisito": {
    icon: "accreditation",
    eyebrow: "Requisito SEREMI",
    title: "Gestiona un requisito completo",
    description: "Evidencias versionadas, observaciones, auditoría y estados.",
    steps: [
      { title: "Sube el documento", text: "PDF, imagen o Word; se versiona solo." },
      { title: "Cambia el estado", text: "Vigente, no aplica o pendiente, con justificación." },
    ],
    benefit: "Cada requisito queda trazado: quién subió qué y cuándo cambió.",
  },

  "accreditation-observaciones": {
    icon: "accreditation",
    eyebrow: "Observaciones SEREMI",
    title: "Hallazgos abiertos y cerrados",
    description: "Observaciones internas o de fiscalización, con su subsanación.",
    steps: [
      { title: "Filtra por estado", text: "Abiertas, en proceso o cerradas." },
      { title: "Cierra con evidencia", text: "Con nota de subsanación y responsable." },
    ],
    benefit: "Reduces el riesgo de multas gestionando hallazgos con plazos claros.",
  },

  "accreditation-carpeta": {
    icon: "accreditation",
    eyebrow: "Carpeta imprimible",
    title: "Exporta tu carpeta SEREMI",
    description: "Vista imprimible con portada, evidencia vigente y detalle (Ctrl+P).",
    steps: [
      { title: "Revisa el resumen", text: "Datos del ELEAM y porcentaje global." },
      { title: "Guarda como PDF", text: "Ctrl+P para tener tu copia digital." },
    ],
    benefit: "Si llega la fiscalización, tienes la carpeta lista en 2 minutos.",
  },

  team: {
    icon: "team",
    eyebrow: "Equipo",
    title: "Funcionarios y familiares",
    description: "Crea cuentas y define permisos a medida por persona.",
    steps: [
      { title: "Crea funcionarios", text: "Email, nombre y cargo; el sistema envía el acceso." },
      { title: "Vincula familiares", text: "A residentes activos, con parentesco y email." },
    ],
    benefit: "Cada persona ve solo lo suyo, sin compartir contraseñas.",
  },

  subscription: {
    icon: "payment",
    eyebrow: "Suscripción",
    title: "Tu plan y pagos",
    description: "Estado de tu suscripción y planes disponibles.",
    steps: [
      { title: "Revisa tu plan", text: "Residentes, funcionarios y vencimiento incluidos." },
      { title: "Paga con MercadoPago", text: "Suscripción recurrente, sin recordar fechas." },
    ],
    benefit: "Servicio activo sin interrupciones, y escalas el plan al crecer.",
  },

  familiar: {
    icon: "familiar",
    eyebrow: "Portal familiar",
    title: "Acompaña a tu familiar a distancia",
    description: "Salud, cuidados del día y signos vitales recientes de tu residente.",
    steps: [
      { title: "Mira el resumen del día", text: "Cuidados, medicamentos y signos de hoy." },
      { title: "Cambia el día", text: "Selecciona otra fecha para ver lo anterior." },
    ],
    benefit: "Sabes cómo está tu familiar sin tener que llamar o ir al ELEAM.",
  },

  "familiar-visitas": {
    icon: "visits",
    eyebrow: "Mis visitas",
    title: "Anuncia y registra tus visitas",
    description: "Avisa al equipo cuando llegues y cuando te vayas; la hora se registra sola.",
    steps: [
      { title: "Anuncia tu llegada", text: "Un click cuando estés en la puerta." },
      { title: "Anuncia tu salida", text: "Al irte, cierras la visita." },
    ],
    benefit: "El equipo sabe quién visita y por cuánto, sin libros de papel.",
  },
};

export function hasCoach(featureId) {
  return Boolean(featureId && COACHES[featureId]);
}

export function getCoach(featureId, rol) {
  if (!hasCoach(featureId)) return null;
  const base = COACHES[featureId];
  const override = rol ? base.roleOverrides?.[rol] : null;
  const merged = override ? { ...base, ...override } : { ...base };
  delete merged.roleOverrides;
  return merged;
}

export function listCoachIds() {
  return Object.keys(COACHES);
}
