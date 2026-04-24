import { supabase } from "../../services/supabaseConfig";

export const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
};

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
  return data;
};

export const register = async ({ nombre, email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } },
  });
  if (error) throw error;

  if (data.user) {
    // Crear ELEAM con pago inactivo — el admin deberá activarlo en /pago
    const { data: eleamData } = await supabase
      .from("eleams")
      .insert({ nombre: `ELEAM de ${nombre}`, email_admin: email, pago_activo: false })
      .select()
      .single();

    await supabase.from("profiles").upsert({
      id:       data.user.id,
      nombre,
      email,
      rol:      "admin_eleam",
      eleam_id: eleamData?.id ?? null,
    });
  }
  return data.user;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
