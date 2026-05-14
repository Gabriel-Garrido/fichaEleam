import { supabase } from "../../services/supabaseConfig";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

export function authErrorMessage(error, fallback = "No pudimos completar la operación. Intenta nuevamente.") {
  const raw = String(error?.message || error?.error_description || error || "");
  const msg = raw.toLowerCase();

  if (isPendingDemoError(error)) {
    return "Tu demo ya fue solicitado y está en revisión. Te avisaremos cuando el acceso esté habilitado.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos. Verifica los datos o recupera tu contraseña.";
  }
  if (msg.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.";
  }
  if (msg.includes("invitacion")) {
    return raw;
  }
  if (msg.includes("invitation") || msg.includes("invite")) {
    return "La invitación no es válida, ya fue usada o expiró. Pide al administrador que genere una nueva.";
  }
  if (msg.includes("cuenta no autorizada") || msg.includes("no autorizado")) {
    return "No encontramos una cuenta habilitada para ese correo. Solicita una demo aprobada o pide que creen tu usuario.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "No pudimos conectar con Supabase. Revisa tu conexión e intenta nuevamente.";
  }

  return fallback;
}

export function isPendingDemoError(error) {
  const msg = String(error?.message || error?.error_description || error || "").toLowerCase();
  return (
    msg.includes("demo_pending") ||
    msg.includes("demo ya fue solicitado") ||
    msg.includes("demo ya se solicito") ||
    msg.includes("demo ya se solicitó") ||
    (msg.includes("solicitud de demo") && msg.includes("pendiente"))
  );
}

export const login = async ({ email, password }) => {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.user;
};

export const loginWithGoogle = async () => {
  const client = requireSupabase();
  // Volvemos a /login: AuthContext detectará la sesión y el componente
  // Login redirigirá al homePath del rol. Esto evita que un familiar
  // o superadmin caiga en /dashboard, donde no le corresponde.
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/login`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
  return data;
};

export const validateInvitationToken = async ({ inviteToken, email = "" }) => {
  const client = requireSupabase();
  const token = String(inviteToken || "").trim();
  if (!token) {
    throw new Error("Invitación inválida. Usa el link completo que recibiste por correo.");
  }

  const { data, error } = await client.rpc("validate_invitation_token", {
    p_token: token,
    p_email: email ? email.trim() : null,
  });

  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.error || "La invitación no es válida o expiró.");
  }
  return data;
};

export const register = async ({ nombre, email, password, inviteToken }) => {
  const client = requireSupabase();
  const cleanEmail = email.trim();
  const cleanInvite = String(inviteToken || "").trim();

  if (!cleanInvite) {
    throw new Error("Invitación inválida. Usa el link completo que recibiste por correo.");
  }

  // El trigger handle_new_user solo acepta registro con invite_token
  // valido. Las cuentas admin ELEAM se crean desde Edge Functions con
  // app_metadata server-side; el cliente nunca puede asignarse rol/eleam_id.
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        nombre: String(nombre || "").trim(),
        invite_token: cleanInvite,
      },
    },
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
