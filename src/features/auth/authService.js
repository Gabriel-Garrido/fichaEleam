import { supabase } from "../../services/supabaseConfig";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

export function isAuthConfigured() {
  return Boolean(supabase);
}

export function authErrorMessage(error, fallback = "No pudimos completar la operación. Intenta nuevamente.") {
  const kind = classifyAuthError(error);
  const raw = String(error?.message || error?.error_description || error || "");

  switch (kind) {
    case "demo_pending":
      return "Tu demo está registrado, pero el login se habilita cuando el equipo aprueba tu cuenta. Te avisaremos cuando el acceso esté listo.";
    case "invalid_credentials":
      return "Correo o contraseña incorrectos. Si solicitaste una demo, espera el correo de activación antes de entrar.";
    case "email_not_confirmed":
      return "Debes confirmar tu correo antes de iniciar sesión.";
    case "already_registered":
      return "Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.";
    case "invitation":
      return raw.toLowerCase().includes("invitacion")
        ? raw
        : "La invitación no es válida, ya fue usada o expiró. Pide al administrador que genere una nueva.";
    case "unauthorized_account":
      return "No encontramos una cuenta habilitada para ese correo. Si solicitaste una demo, espera la aprobación; si eres funcionario o familiar, pide que creen tu usuario.";
    case "network":
      return "No pudimos conectar con Supabase. Revisa tu conexión e intenta nuevamente.";
    case "session_missing":
      return "El enlace no logró iniciar una sesión válida. Solicita un nuevo link de recuperación e inténtalo nuevamente.";
    case "supabase_config":
      return "Supabase no está configurado. Revisa las variables de entorno antes de iniciar sesión.";
    default:
      return fallback;
  }
}

export function isPendingDemoError(error) {
  return classifyAuthError(error) === "demo_pending";
}

export function classifyAuthError(error) {
  const msg = String(error?.message || error?.error_description || error || "").toLowerCase();

  if (
    msg.includes("demo_pending") ||
    msg.includes("demo ya fue solicitado") ||
    msg.includes("demo ya se solicito") ||
    msg.includes("demo ya se solicitó") ||
    msg.includes("login se habilita") ||
    (msg.includes("solicitud de demo") && msg.includes("pendiente"))
  ) return "demo_pending";

  if (msg.includes("invalid login credentials")) return "invalid_credentials";
  if (msg.includes("email not confirmed")) return "email_not_confirmed";
  if (msg.includes("user already registered") || msg.includes("already been registered")) return "already_registered";
  if (msg.includes("invitacion") || msg.includes("invitation") || msg.includes("invite")) return "invitation";
  if (
    msg.includes("cuenta no autorizada") ||
    msg.includes("no autorizado") ||
    msg.includes("not authorized") ||
    msg.includes("debe ser aprobada")
  ) return "unauthorized_account";
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("fetch")) return "network";
  if (
    msg.includes("auth session missing") ||
    msg.includes("session missing") ||
    msg.includes("missing session") ||
    msg.includes("no current session")
  ) return "session_missing";
  if (msg.includes("supabase no está configurado") || msg.includes("supabase no esta configurado")) return "supabase_config";

  return "unknown";
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

// Estado de la solicitud de demo de un correo: "aprobado" | "pendiente" | "none".
// Permite que el login muestre un aviso claro cuando alguien intenta entrar
// con un correo cuya demo todavía no fue habilitada por el equipo.
export const getDemoRequestStatus = async (email) => {
  const client = requireSupabase();
  const { data, error } = await client.rpc("demo_lead_status", {
    p_email: String(email ?? "").trim(),
  });
  if (error) return "none";
  return data ?? "none";
};

export function subscribePasswordRecovery(onRecovery) {
  const client = requireSupabase();
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (
      event === "PASSWORD_RECOVERY" ||
      (session && ["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event))
    ) {
      onRecovery?.(session, event);
    }
  });
  return () => subscription.unsubscribe();
}

export async function getCurrentAuthSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

export async function requestPasswordReset(email, redirectTo) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(String(email ?? "").trim(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function clearMustResetPassword(userId) {
  const client = requireSupabase();
  if (!userId) throw new Error("Usuario no autenticado.");
  const { error } = await client
    .from("profiles")
    .update({ must_reset_password: false })
    .eq("id", userId);
  if (error) throw error;
}

export async function updatePasswordAndClearResetFlag(password, userId = null) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;

  if (userId) {
    await clearMustResetPassword(userId);
    return;
  }

  const { data, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (data?.user?.id) await clearMustResetPassword(data.user.id);
}

function googleOAuthOptions(redirectTo) {
  return {
    redirectTo: redirectTo || `${window.location.origin}/login`,
    queryParams: {
      access_type: "offline",
      prompt: "select_account",
    },
  };
}

export const loginWithGoogle = async ({ redirectTo } = {}) => {
  const client = requireSupabase();
  // Volvemos a /login: AuthContext detectará la sesión y el componente
  // Login redirigirá al homePath del rol. Esto evita que un familiar
  // o superadmin caiga en /dashboard, donde no le corresponde.
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: googleOAuthOptions(redirectTo),
  });
  if (error) throw error;
  return data;
};

export const continueWithGoogleForActivation = async ({ redirectTo } = {}) => {
  const client = requireSupabase();
  const session = await getCurrentAuthSession().catch(() => null);

  if (session?.user?.id && typeof client.auth.linkIdentity === "function") {
    const { data, error } = await client.auth.linkIdentity({
      provider: "google",
      options: googleOAuthOptions(redirectTo || `${window.location.origin}/cambiar-clave?linked=google`),
    });
    if (!error) return data;

    // Si el proveedor no permite vincular en este contexto, usamos el flujo
    // normal de Google. AuthContext resolverá el destino según el perfil.
    console.warn("No se pudo vincular Google directamente; usando login OAuth.", error);
  }

  return loginWithGoogle({ redirectTo: `${window.location.origin}/login` });
};

export const logout = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
