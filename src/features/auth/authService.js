import { supabase } from "../../services/supabaseConfig";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
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

export const register = async ({ nombre, email, password, inviteToken }) => {
  const client = requireSupabase();
  const cleanEmail = email.trim();

  // El trigger handle_new_user solo acepta registro con invite_token
  // valido. Las cuentas admin ELEAM se crean desde Edge Functions con
  // app_metadata server-side; el cliente nunca puede asignarse rol/eleam_id.
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        nombre,
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      },
    },
  });
  if (error) throw error;
  return data.user;
};

export const logout = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
