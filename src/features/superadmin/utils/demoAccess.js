const TERMINAL_STATES = new Set(["descartado", "convertido"]);

function isExpired(iso, now = new Date()) {
  if (!iso) return false;
  const expiresAt = new Date(iso);
  return !Number.isNaN(expiresAt.valueOf()) && expiresAt < now;
}

export function getDemoLeadAccessState(lead = {}, now = new Date()) {
  if (TERMINAL_STATES.has(lead.estado)) {
    return {
      key: "blocked_state",
      label: lead.estado === "convertido" ? "Convertido" : "Descartado",
      tone: "slate",
      canGrant: false,
      actionLabel: "Lead cerrado",
      description: "Este lead ya fue cerrado y no debe recibir acceso demo desde este flujo.",
    };
  }

  if (lead.demo_user_id) {
    return {
      key: "account_demo",
      label: "Cuenta demo aprobada",
      tone: "emerald",
      canGrant: false,
      actionLabel: "Acceso ya aprobado",
      description: "El lead ya tiene una cuenta real para iniciar sesion.",
    };
  }

  if (lead.demo_token && isExpired(lead.demo_expires_at, now)) {
    return {
      key: "expired_guided_demo",
      label: "Demo vencido",
      tone: "rose",
      canGrant: true,
      actionLabel: "Aprobar cuenta demo",
      description: "El demo guiado vencio, pero se puede crear una cuenta real si corresponde.",
    };
  }

  if (lead.demo_token) {
    return {
      key: "guided_demo",
      label: "Demo guiado",
      tone: "teal",
      canGrant: true,
      actionLabel: "Aprobar cuenta con login",
      description: "El lead puede explorar el demo guiado, pero todavia no tiene cuenta para iniciar sesion.",
    };
  }

  return {
    key: "pending_request",
    label: "Solicitud pendiente",
    tone: "amber",
    canGrant: true,
    actionLabel: "Crear cuenta demo",
    description: "Solicitud recibida, pendiente de aprobacion manual.",
  };
}

export function demoGrantResultMessage(result = {}) {
  const emailFailed = result.email_error || (result.temp_password && result.email_sent === false);

  if (result.code === "already_active" || result.already_active) {
    return {
      title: "Demo ya aprobado",
      toast: "Este lead ya tenia acceso demo aprobado",
      body: "No se creo una cuenta nueva. Si el usuario no recuerda su acceso, debe usar recuperar acceso.",
    };
  }

  if (result.code === "reused_demo" || result.reused_existing_user) {
    return {
      title: "Demo reutilizado",
      toast: "Demo activado usando una cuenta existente",
      body: "El correo ya tenia una cuenta compatible. El usuario debe entrar con su metodo de acceso actual o recuperar acceso.",
    };
  }

  if (result.code === "repaired_auth" || result.repaired_existing_auth_user) {
    return {
      title: "Cuenta reparada",
      toast: emailFailed
        ? "Cuenta demo reparada; comparte las credenciales manualmente"
        : "Cuenta demo reparada correctamente",
      body: "Existia un usuario Auth sin perfil operativo. Se reparo y se genero una contrasena temporal.",
    };
  }

  if (result.code === "blocked_state") {
    return {
      title: "Lead no habilitable",
      toast: result.message || "Este lead no puede recibir acceso demo desde su estado actual",
      body: result.message || "Revisa el estado del lead antes de intentar aprobarlo.",
    };
  }

  if (result.code === "email_invalid") {
    return {
      title: "Correo invalido",
      toast: result.message || "El correo del lead no es valido",
      body: "Corrige el correo del lead y vuelve a intentar.",
    };
  }

  if (result.code === "production_account") {
    return {
      title: "Cuenta productiva activa",
      toast: result.message || "Este correo ya pertenece a un ELEAM activo",
      body: "No se modifico la cuenta para evitar sobrescribir una suscripcion real.",
    };
  }

  if (result.code === "conflict") {
    return {
      title: "Conflicto de cuenta",
      toast: result.message || "Este correo ya tiene una cuenta incompatible",
      body: "Revisa el correo y el usuario asociado antes de volver a intentar.",
    };
  }

  if (result.code === "not_found") {
    return {
      title: "Lead no encontrado",
      toast: result.message || "No encontramos este lead",
      body: "Actualiza la lista y vuelve a intentar.",
    };
  }

  if (result.code === "forbidden" || result.code === "unauthenticated") {
    return {
      title: "Sin permiso",
      toast: result.message || "Tu sesion no tiene permisos para aprobar demos",
      body: "Vuelve a iniciar sesion con una cuenta superadmin.",
    };
  }

  if (result.code === "internal_error" || result.code === "demo_grant_error") {
    return {
      title: "No se pudo aprobar",
      toast: result.message || "No se pudo activar el acceso demo. Intenta nuevamente.",
      body: "No se compartieron credenciales nuevas. Revisa el lead y vuelve a intentar.",
    };
  }

  if (emailFailed) {
    return {
      title: "Usuario demo creado",
      toast: "Cuenta demo creada; comparte las credenciales manualmente",
      body: result.email_error
        ? `No se pudo enviar el correo automatico: ${result.email_error}`
        : "No se envio correo automatico. Copia las credenciales y compartelas por un canal seguro.",
    };
  }

  return {
    title: "Usuario demo creado",
    toast: "Usuario demo creado correctamente",
    body: result.email_sent
      ? "El usuario recibira las credenciales por correo."
      : "Se genero una cuenta demo. Comparte las credenciales si el correo automatico no fue enviado.",
  };
}

export function demoAccessToneClasses(tone) {
  const map = {
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[tone] ?? map.slate;
}
