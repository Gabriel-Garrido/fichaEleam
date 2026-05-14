export const ONBOARDING_STORAGE_PREFIX = 'fichaeleam_onboarding_v2_';

// Each step may declare:
//   requiredPermission  → result of can(perm) must be true  (funcionario only)
//   requiredFeature     → result of canFeature(id) must be true
// Steps without either field are always visible for the role.
export const ROLE_CONFIG = {
  admin_eleam: {
    color: 'teal',
    welcomeEmoji: '🏥',
    welcomeTagline: 'Tu ELEAM digital ya está listo para operar.',
    welcomeBody:
      'En pocos minutos tendrás fichas clínicas, signos vitales con alertas, carpeta SEREMI y tu equipo completo funcionando desde cualquier dispositivo.',
    welcomeBodyMobile:
      'Fichas, signos vitales y carpeta SEREMI listos para operar.',
    welcomeHighlights: [
      {
        icon: 'residents',
        text: 'Fichas digitales con Índice Barthel, alergias e historial completo',
      },
      {
        icon: 'vitals',
        text: 'Signos vitales con alertas clínicas automáticas por turno',
      },
      {
        icon: 'accreditation',
        text: 'Carpeta SEREMI DS 14/2017 lista para fiscalización con evidencias versionadas',
      },
      {
        icon: 'team',
        text: 'Gestión de equipo con permisos granulares por funcionario',
      },
    ],
    welcomeCta: 'Comenzar guía',
    steps: [
      {
        id: 'explorar_dashboard',
        label: 'Conoce el dashboard',
        description: 'Estado en tiempo real de tu ELEAM.',
        icon: 'home',
        route: '/dashboard',
        matchRoutes: ['/dashboard'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Aquí verás alertas críticas, residentes sin control reciente y actividad del turno. El dashboard cambia según el rol del usuario.',
        mobileTip: 'Alertas críticas y actividad del turno actual.',
      },
      {
        id: 'crear_residente',
        label: 'Registra un residente',
        description: 'La ficha digital del primer habitante.',
        icon: 'residents',
        route: '/residents/new',
        matchRoutes: ['/residents'],
        autoCompleteAfter: 8000,
        desktopTip:
          'Cada residente tiene diagnóstico principal, Índice Barthel, alergias, habitación, cama e historial clínico completo. El nivel de dependencia se calcula automáticamente.',
        mobileTip: 'Completa la ficha básica: nombre, RUT, diagnóstico y Barthel.',
      },
      {
        id: 'invitar_equipo',
        label: 'Invita a tu equipo',
        description: 'Crea cuentas para el personal clínico.',
        icon: 'team',
        route: '/equipo',
        matchRoutes: ['/equipo'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Crea cuentas para enfermeras, kinesiólogos, auxiliares y familiares. Cada funcionario recibe un email con su contraseña temporal.',
        mobileTip: 'Agrega personal clínico y familiares con acceso propio.',
      },
      {
        id: 'configurar_permisos',
        label: 'Configura permisos del equipo',
        description: 'Define qué puede ver y registrar cada funcionario.',
        icon: 'team',
        route: '/equipo',
        matchRoutes: ['/equipo/permisos'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Define permisos granulares por funcionario: qué módulos puede ver, qué puede registrar y qué puede eliminar. Usa las plantillas por cargo para agilizar la configuración.',
        mobileTip: 'Ajusta los permisos de cada miembro del equipo.',
      },
      {
        id: 'registrar_signo',
        label: 'Registra un signo vital',
        description: 'Formulario rápido con validación clínica.',
        icon: 'vitals',
        route: '/vital-signs/new',
        matchRoutes: ['/vital-signs'],
        autoCompleteAfter: 6000,
        desktopTip:
          'El formulario valida cada valor contra rangos clínicos para adultos mayores. Si un parámetro está fuera del rango normal, la alerta aparece de inmediato y queda registrada.',
        mobileTip: 'Ingresa PA, FC, temperatura y saturación con validación automática.',
      },
      {
        id: 'ver_acreditacion',
        label: 'Explora la carpeta SEREMI',
        description: '14 ámbitos DS 14/2017 ya organizados.',
        icon: 'accreditation',
        route: '/accreditation',
        matchRoutes: ['/accreditation'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Sube evidencias PDF o Word, gestiona estados de cada requisito y genera la carpeta imprimible lista para la visita del fiscalizador.',
        mobileTip: 'Revisa el estado de cumplimiento y sube evidencias SEREMI.',
      },
    ],
  },

  funcionario: {
    color: 'rose',
    welcomeEmoji: '🩺',
    welcomeTagline: 'Tu espacio de trabajo clínico está listo.',
    welcomeBody:
      'Accede solo a los módulos que te asignó el administrador del establecimiento. Todo lo que registres queda firmado digitalmente con tu nombre y timestamp.',
    welcomeBodyMobile:
      'Tus módulos clínicos están listos. Todo queda firmado con tu nombre.',
    welcomeHighlights: [
      {
        icon: 'vitals',
        text: 'Signos vitales con validación clínica en vivo y alertas automáticas',
        requiredPermission: 'crear_signos_vitales',
      },
      {
        icon: 'observations',
        text: '12 tipos de observaciones diarias con firma digital automática',
        requiredPermission: 'crear_observaciones',
      },
      {
        icon: 'accreditation',
        text: 'Documentos de acreditación SEREMI: sube y gestiona evidencias',
        requiredPermission: 'subir_acreditacion',
      },
    ],
    welcomeCta: 'Empezar',
    steps: [
      {
        id: 'ver_dashboard',
        label: 'Revisa el turno actual',
        description: 'Alertas y actividad del turno.',
        icon: 'home',
        route: '/dashboard',
        matchRoutes: ['/dashboard'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Verás alertas clínicas activas, residentes que requieren atención hoy y el resumen del turno. El dashboard prioriza la información más urgente.',
        mobileTip: 'Alertas clínicas y residentes prioritarios de este turno.',
      },
      {
        id: 'registrar_signo',
        label: 'Registra un signo vital',
        description: 'Formulario rápido con validación clínica.',
        icon: 'vitals',
        route: '/vital-signs/new',
        matchRoutes: ['/vital-signs'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Si un valor está fuera del rango clínico para adultos mayores, la alerta aparece de inmediato en el formulario y queda registrada en el historial.',
        mobileTip: 'Ingresa los valores y ve las alertas clínicas al instante.',
        requiredPermission: 'crear_signos_vitales',
      },
      {
        id: 'escribir_observacion',
        label: 'Escribe una observación',
        description: '12 tipos con firma digital automática.',
        icon: 'observations',
        route: '/observations/new',
        matchRoutes: ['/observations'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Selecciona el tipo de observación, escribe tu nota y queda registrada con timestamp, turno y tu firma. Puedes marcarla para seguimiento.',
        mobileTip: 'Selecciona el tipo, escribe la nota y guarda con tu firma.',
        requiredPermission: 'crear_observaciones',
      },
      {
        id: 'subir_documento',
        label: 'Sube un documento SEREMI',
        description: 'Evidencias para la carpeta de acreditación.',
        icon: 'accreditation',
        route: '/accreditation',
        matchRoutes: ['/accreditation'],
        autoCompleteAfter: 8000,
        desktopTip:
          'Sube PDF, imágenes o Word como evidencia de los requisitos SEREMI. Cada archivo queda versionado y asociado al requisito correspondiente.',
        mobileTip: 'Sube PDF o imágenes como evidencia de requisitos SEREMI.',
        requiredPermission: 'subir_acreditacion',
      },
    ],
  },

  familiar: {
    color: 'blue',
    welcomeEmoji: '💙',
    welcomeTagline: 'Sigue de cerca a tu familiar en el ELEAM.',
    welcomeBody:
      'Consulta su estado de salud actualizado, revisa las notas del equipo clínico y registra tus visitas cuando lo necesites, desde cualquier dispositivo.',
    welcomeBodyMobile:
      'Estado de salud y visitas de tu familiar, siempre a mano.',
    welcomeHighlights: [
      {
        icon: 'vitals',
        text: 'Signos vitales recientes con semáforo visual de estado',
      },
      {
        icon: 'observations',
        text: 'Notas y observaciones del equipo clínico por turno',
      },
      { icon: 'visits', text: 'Registro de visitas con duración y notas personales' },
    ],
    welcomeCta: 'Ver a mi familiar',
    steps: [
      {
        id: 'ver_portal',
        label: 'Conoce tu portal',
        description: 'Signos vitales, observaciones y más.',
        icon: 'familiar',
        route: '/familiar',
        matchRoutes: ['/familiar'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Aquí verás el resumen de salud de tu familiar: los últimos signos vitales con su estado (normal, alerta, crítico) y las observaciones recientes del equipo.',
        mobileTip: 'Signos vitales recientes y notas clínicas de tu familiar.',
      },
      {
        id: 'registrar_visita',
        label: 'Registra una visita',
        description: 'Anota cuándo visitaste a tu familiar.',
        icon: 'visits',
        route: '/familiar/visitas',
        matchRoutes: ['/familiar/visitas'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Registra la duración de la visita, agrega notas y queda guardado en el historial del establecimiento. Puedes ver todas tus visitas anteriores.',
        mobileTip: 'Anota la duración y una nota breve de tu visita.',
      },
    ],
  },

  superadmin: {
    color: 'slate',
    welcomeEmoji: '📊',
    welcomeTagline: 'Panel de operación de la plataforma FichaEleam.',
    welcomeBody:
      'Gestiona todos los ELEAMs suscriptos, aprueba solicitudes de demo, registra pagos manualmente y publica contenido editorial desde un solo lugar.',
    welcomeBodyMobile:
      'CRM, demos, pagos y blog de la plataforma en un solo panel.',
    welcomeHighlights: [
      { icon: 'overview', text: 'CRM con métricas en tiempo real: MRR, activos, demos, leads' },
      { icon: 'leads', text: 'Gestión de leads y aprobación de demos con un clic' },
      { icon: 'blog', text: 'Editor de blog con Markdown, SEO y estado de publicación' },
    ],
    welcomeCta: 'Ir al panel',
    steps: [
      {
        id: 'explorar_crm',
        label: 'Explora el CRM',
        description: 'Métricas, ELEAMs activos y leads.',
        icon: 'overview',
        route: '/superadmin',
        matchRoutes: ['/superadmin'],
        autoCompleteAfter: 8000,
        desktopTip:
          'Verás MRR, ELEAMs activos, demos en curso, leads sin respuesta y el estado de churn de cada cliente. Haz clic en cualquier fila para abrir la ficha 360.',
        mobileTip: 'MRR, ELEAMs activos y leads en tiempo real.',
      },
      {
        id: 'ver_blog',
        label: 'Revisa el blog',
        description: 'Crea y publica contenido editorial.',
        icon: 'blog',
        route: '/superadmin/blog',
        matchRoutes: ['/superadmin/blog'],
        autoCompleteAfter: 6000,
        desktopTip:
          'Editor con soporte Markdown, cover image, meta SEO, keywords y estado de publicación. Los posts publicados aparecen en /blog con JSON-LD para LLMs.',
        mobileTip: 'Crea y publica posts con Markdown y SEO integrado.',
      },
    ],
  },
};

// Tailwind class tokens per color — all classes are static so Tailwind includes them.
export const COLOR_CLASSES = {
  teal: {
    bg: 'bg-teal-50',
    bgStrong: 'bg-teal-600',
    text: 'text-teal-700',
    textStrong: 'text-teal-900',
    border: 'border-teal-200',
    btn: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500',
    progressColor: '#0d9488',
    pill: 'bg-teal-600',
  },
  rose: {
    bg: 'bg-rose-50',
    bgStrong: 'bg-rose-600',
    text: 'text-rose-700',
    textStrong: 'text-rose-900',
    border: 'border-rose-200',
    btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
    progressColor: '#e11d48',
    pill: 'bg-rose-600',
  },
  blue: {
    bg: 'bg-blue-50',
    bgStrong: 'bg-blue-600',
    text: 'text-blue-700',
    textStrong: 'text-blue-900',
    border: 'border-blue-200',
    btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    progressColor: '#2563eb',
    pill: 'bg-blue-600',
  },
  slate: {
    bg: 'bg-slate-100',
    bgStrong: 'bg-slate-700',
    text: 'text-slate-700',
    textStrong: 'text-slate-900',
    border: 'border-slate-300',
    btn: 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500',
    progressColor: '#475569',
    pill: 'bg-slate-700',
  },
};
