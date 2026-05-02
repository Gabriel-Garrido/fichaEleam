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
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
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

  // user_metadata se usa para que el trigger handle_new_user lea
  // el invite_token y asigne rol=funcionario + eleam_id correspondiente.
  // El trigger valida el token (email match, no usado, no expirado) en la BD.
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

  // Solo admins generan ELEAM al registrarse. Si hay invitación,
  // el trigger ya asignó eleam_id+rol=funcionario; no creamos ELEAM extra.
  if (data.user && !inviteToken) {
    // El trigger handle_new_user creó el profile con rol=admin_eleam
    // sin eleam_id. AuthContext lo detectará y creará el ELEAM.
    // Mantenemos este insert como respaldo idempotente para entornos
    // donde el trigger pueda fallar.
    try {
      const { data: existingProfile } = await client
        .from("profiles")
        .select("id, eleam_id, rol")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existingProfile?.eleam_id && existingProfile?.rol === "admin_eleam") {
        const { data: eleamData } = await client
          .from("eleams")
          .insert({
            nombre: `ELEAM de ${nombre}`,
            email_admin: cleanEmail,
            pago_activo: false,
            subscription_status: "inactivo",
          })
          .select()
          .single();
        if (eleamData?.id) {
          await client
            .from("profiles")
            .update({ eleam_id: eleamData.id })
            .eq("id", data.user.id);
        }
      }
    } catch (e) {
      // Best-effort. AuthContext hará la recuperación al cargar el perfil.
      console.warn("auth: fallback ELEAM/profile setup", e);
    }
  }
  return data.user;
};

export const logout = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
