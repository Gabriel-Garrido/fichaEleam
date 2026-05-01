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

export const register = async ({ nombre, email, password }) => {
  const client = requireSupabase();
  const cleanEmail = email.trim();
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { nombre } },
  });
  if (error) throw error;

  if (data.user) {
    // Crear ELEAM con pago inactivo — el admin deberá activarlo en /pago
    const { data: eleamData } = await client
      .from("eleams")
      .insert({ nombre: `ELEAM de ${nombre}`, email_admin: cleanEmail, pago_activo: false })
      .select()
      .single();

    await client.from("profiles").upsert({
      id:       data.user.id,
      nombre,
      email:    cleanEmail,
      rol:      "admin_eleam",
      eleam_id: eleamData?.id ?? null,
    });
  }
  return data.user;
};

export const logout = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
