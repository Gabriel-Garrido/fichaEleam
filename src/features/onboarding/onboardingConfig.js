export const ONBOARDING_STORAGE_PREFIX = 'fichaeleam_onboarding_v2_';

// Each step may declare:
//   requiredPermission  → result of can(perm) must be true  (funcionario only)
//   requiredFeature     → result of canFeature(id) must be true
// Steps without either field are always visible for the role.
export const ROLE_CONFIG = {
  admin_eleam: {
    color: 'teal',
    welcomeEmoji: '🏥',
    welcomeTagline: 'Tu ELEAM digital ya está activo.',
    welcomeBody: 'En minutos tendrás fichas, signos vitales y acreditación SEREMI funcionando.',
    welcomeHighlights: [
      { icon: 'residents', text: 'Fichas digitales de residentes' },
      { icon: 'vitals', text: 'Signos vitales con alertas clínicas' },
      { icon: 'accreditation', text: 'Carpeta SEREMI lista para fiscalización' },
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
        tip: 'Aquí verás alertas críticas, residentes sin control y actividad del turno.',
      },
      {
        id: 'crear_residente',
        label: 'Registra un residente',
        description: 'La ficha digital del primer habitante.',
        icon: 'residents',
        route: '/residents/new',
        matchRoutes: ['/residents'],
        autoCompleteAfter: 8000,
        tip: 'Cada residente tiene diagnóstico, Índice Barthel, alergias e historial completo.',
      },
      {
        id: 'invitar_equipo',
        label: 'Invita a tu equipo',
        description: 'Crea cuentas para el personal clínico.',
        icon: 'team',
        route: '/equipo',
        matchRoutes: ['/equipo'],
        autoCompleteAfter: 6000,
        tip: 'Define permisos granulares por funcionario: qué puede ver y registrar.',
      },
      {
        id: 'ver_acreditacion',
        label: 'Explora la carpeta SEREMI',
        description: '14 ámbitos DS 14/2017 ya organizados.',
        icon: 'accreditation',
        route: '/accreditation',
        matchRoutes: ['/accreditation'],
        autoCompleteAfter: 6000,
        tip: 'Sube evidencias, gestiona estados y genera la carpeta lista para fiscalización.',
      },
    ],
  },

  funcionario: {
    color: 'rose',
    welcomeEmoji: '🩺',
    welcomeTagline: 'Tu espacio de trabajo clínico.',
    welcomeBody: 'Accede solo a los módulos que te asignó el administrador del establecimiento.',
    // Highlights are also permission-gated so the modal reflects what this
    // specific funcionario can actually do.
    welcomeHighlights: [
      {
        icon: 'vitals',
        text: 'Signos vitales con validación en vivo',
        requiredPermission: 'crear_signos_vitales',
      },
      {
        icon: 'observations',
        text: '12 tipos de observaciones diarias',
        requiredPermission: 'crear_observaciones',
      },
      {
        icon: 'accreditation',
        text: 'Documentos de acreditación SEREMI',
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
        tip: 'Verás alertas clínicas activas y residentes que requieren atención hoy.',
        // No requiredPermission — dashboard siempre disponible
      },
      {
        id: 'registrar_signo',
        label: 'Registra un signo vital',
        description: 'Formulario rápido con validación clínica.',
        icon: 'vitals',
        route: '/vital-signs/new',
        matchRoutes: ['/vital-signs'],
        autoCompleteAfter: 6000,
        tip: 'Si un valor está fuera del rango, la alerta aparece de inmediato.',
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
        tip: 'Selecciona el tipo, escribe tu nota y queda registrada con timestamp y tu firma.',
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
        tip: 'Sube PDF, imágenes o Word como evidencia de los requisitos SEREMI.',
        requiredPermission: 'subir_acreditacion',
      },
    ],
  },

  familiar: {
    color: 'blue',
    welcomeEmoji: '💙',
    welcomeTagline: 'Sigue de cerca a tu familiar.',
    welcomeBody: 'Consulta su estado de salud y registra tus visitas en cualquier momento.',
    welcomeHighlights: [
      { icon: 'vitals', text: 'Signos vitales con semáforo visual' },
      { icon: 'observations', text: 'Notas del equipo clínico' },
      { icon: 'visits', text: 'Registro de visitas' },
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
        tip: 'Aquí verás el resumen de salud de tu familiar: signos recientes y observaciones.',
      },
      {
        id: 'registrar_visita',
        label: 'Registra una visita',
        description: 'Anota cuándo visitaste a tu familiar.',
        icon: 'visits',
        route: '/familiar/visitas',
        matchRoutes: ['/familiar/visitas'],
        autoCompleteAfter: 6000,
        tip: 'Registra duración, notas y queda en el historial del establecimiento.',
        // Familiares always have this right — no per-profile permission gate needed
      },
    ],
  },

  superadmin: {
    color: 'slate',
    welcomeEmoji: '📊',
    welcomeTagline: 'Panel de operación de la plataforma.',
    welcomeBody: 'Gestiona todos los ELEAMs, aprueba demos y publica contenido editorial.',
    welcomeHighlights: [
      { icon: 'overview', text: 'CRM con métricas en tiempo real' },
      { icon: 'leads', text: 'Gestión de leads y demos' },
      { icon: 'blog', text: 'Blog y contenido editorial' },
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
        tip: 'Verás MRR, ELEAMs activos, demos en curso y leads sin respuesta.',
      },
      {
        id: 'ver_blog',
        label: 'Revisa el blog',
        description: 'Crea y publica contenido editorial.',
        icon: 'blog',
        route: '/superadmin/blog',
        matchRoutes: ['/superadmin/blog'],
        autoCompleteAfter: 6000,
        tip: 'Editor con soporte Markdown, cover image, SEO y estado de publicación.',
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
