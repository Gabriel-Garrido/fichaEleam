import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseConfig";
import Loading from "../components/Loading";

const AuthContext = createContext();
const LoadingContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [eleam, setEleam]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [supabaseError, setSupabaseError]   = useState(false);
  const [authNotice, setAuthNotice]         = useState(null);

  const fetchProfileAndEleam = useCallback(async (authUser) => {
    if (!supabase) return;
    const userId = typeof authUser === "string" ? authUser : authUser?.id;
    const email = typeof authUser === "string" ? null : authUser?.email;
    const metadata = typeof authUser === "string" ? {} : (authUser?.user_metadata ?? {});
    const displayName =
      metadata.nombre ||
      metadata.full_name ||
      metadata.name ||
      email?.split("@")[0] ||
      "Usuario";

    if (!userId) return;

    setProfileLoading(true);
    setAuthNotice(null);
    try {
      let { data, error } = await supabase
        .from("profiles")
        .select("*, eleams(*, planes(*))")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data && email) {
        const { data: newEleam, error: eleamError } = await supabase
          .from("eleams")
          .insert({
            nombre: `ELEAM de ${displayName}`,
            email_admin: email,
            pago_activo: false,
            subscription_status: "inactivo",
          })
          .select()
          .maybeSingle();

        const profilePayload = {
          id: userId,
          nombre: displayName,
          email,
          rol: "admin_eleam",
          eleam_id: eleamError ? null : newEleam?.id ?? null,
        };

        const { data: createdProfile, error: profileError } = await supabase
          .from("profiles")
          .upsert(profilePayload)
          .select("*, eleams(*)")
          .maybeSingle();

        if (profileError) throw profileError;
        data = createdProfile;

        if (eleamError) {
          setAuthNotice("Tu cuenta se creó, pero aún falta asociarla a un ELEAM. Puedes continuar desde el panel de pago.");
        }
      }

      if (!data) {
        setAuthNotice("No pudimos cargar tu perfil todavía. Intenta nuevamente en unos segundos.");
        return;
      }

      // Si el admin no tiene ELEAM asociado, crear uno automáticamente.
      // Los funcionarios SIEMPRE deben tener eleam_id (lo asigna el trigger
      // al consumir un invite_token); si no lo tienen → es un error.
      if (!data.eleam_id && data.rol === "admin_eleam") {
        const { data: newEleam, error: eleamError } = await supabase
          .from("eleams")
          .insert({
            nombre: `ELEAM de ${data.nombre}`,
            email_admin: data.email,
            pago_activo: false,
            subscription_status: "inactivo",
          })
          .select("*, planes(*)")
          .maybeSingle();

        if (!eleamError && newEleam) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ eleam_id: newEleam.id })
            .eq("id", userId);
          if (updateError) throw updateError;
          data.eleam_id = newEleam.id;
          data.eleams   = newEleam;
        } else {
          setAuthNotice("Tu sesión está activa, pero aún no se pudo crear el ELEAM asociado.");
        }
      } else if (!data.eleam_id && (data.rol === "funcionario" || data.rol === "familiar")) {
        setAuthNotice("Tu cuenta no tiene un ELEAM asociado. Contacta al administrador del establecimiento.");
      }

      setProfile(data);
      setEleam(data.eleams ?? null);
    } catch (error) {
      console.warn("No se pudo cargar el perfil:", error);
      setAuthNotice("Iniciaste sesión, pero no pudimos cargar todos los datos de tu cuenta.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error;
        setUser(session?.user ?? null);
        if (session?.user) fetchProfileAndEleam(session.user);
        setAuthLoading(false);
      })
      .catch(() => {
        setSupabaseError(true);
        setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfileAndEleam(session.user);
        } else {
          setProfile(null);
          setEleam(null);
          setAuthNotice(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfileAndEleam]);

  // El pago se considera activo si el ELEAM tiene subscription_status
  // 'activo' o 'en_gracia', o si el usuario es superadmin.
  // pago_activo se sincroniza vía trigger en la BD; lo usamos como fallback.
  const pagoActivo =
    profile?.rol === "superadmin" ||
    ["activo", "en_gracia"].includes(eleam?.subscription_status) ||
    eleam?.pago_activo === true;

  const plan = eleam?.planes ?? null;
  const subscriptionStatus = eleam?.subscription_status ?? "inactivo";
  const rol = profile?.rol ?? null;
  const isAdminEleam  = rol === "admin_eleam";
  const isFuncionario = rol === "funcionario";
  const isFamiliar    = rol === "familiar";
  const isSuperadmin  = rol === "superadmin";
  const isStaff       = isAdminEleam || isFuncionario;

  // Ruta inicial según rol/estado de suscripción.
  // Se usa en el Navbar y en redirecciones del Router.
  let homePath = "/";
  if (user) {
    if (isSuperadmin)            homePath = "/superadmin";
    else if (isFamiliar)         homePath = "/familiar";
    else if (pagoActivo)         homePath = "/dashboard";
    else                         homePath = "/pago?sinAcceso=1";
  }

  const value = {
    user,
    profile,
    eleam,
    plan,
    subscriptionStatus,
    pagoActivo,
    rol,
    isAdminEleam,
    isFuncionario,
    isFamiliar,
    isSuperadmin,
    isStaff,
    homePath,
    profileLoading,
    authLoading,
    authNotice,
    supabaseError: supabaseError || !isSupabaseConfigured,
    refetchProfile: () => user && fetchProfileAndEleam(user),
  };

  if (authLoading) return <Loading message="Verificando autenticación..." />;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {loading && <Loading message="Cargando..." />}
      {children}
    </LoadingContext.Provider>
  );
}

export const useAuth    = () => useContext(AuthContext);
export const useLoading = () => useContext(LoadingContext);
export { AuthContext, LoadingContext };
