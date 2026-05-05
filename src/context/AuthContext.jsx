import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseConfig";
import Loading from "../components/Loading";

const AuthContext = createContext();
const LoadingContext = createContext();
const PLATFORM_SUPERADMIN_EMAILS = new Set(["gabrielgarrido89@gmail.com"]);

function isPlatformSuperadminEmail(email) {
  return PLATFORM_SUPERADMIN_EMAILS.has((email || "").trim().toLowerCase());
}

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
    const userEmail = typeof authUser === "string" ? "" : authUser?.email;
    if (!userId) return;

    setProfileLoading(true);
    setAuthNotice(null);
    try {
      // El profile y el ELEAM (si corresponde) los crea el trigger
      // handle_new_user en SIGNUP — no los creamos desde el cliente.
      // Si el profile no aparece todavía es por replicación de la
      // sesión recién creada; reintentamos una vez tras 600ms.
      // Selección explícita de columnas: NO traemos notas_admin (notas
      // internas del operador) ni rut_empresa al cliente del propio
      // ELEAM, aunque RLS permita leerlas. Solo lo que la app usa.
      const PROFILE_SELECT = `
        id, nombre, email, rol, eleam_id, creado_en,
        eleams!profiles_eleam_id_fkey (
          id, nombre, email_admin, telefono, plan, plan_id,
          subscription_status, pago_activo, mp_preapproval_id, mp_payer_email,
          proximo_cobro_en, cancelado_en, fecha_vencimiento_suscripcion,
          max_residentes, max_funcionarios, fecha_pago, creado_en,
          planes ( * )
        )
      `;
      let { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await new Promise((r) => setTimeout(r, 600));
        const retry = await supabase
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("id", userId)
          .maybeSingle();
        data = retry.data;
        if (retry.error) throw retry.error;
      }

      if (isPlatformSuperadminEmail(userEmail) && data?.rol !== "superadmin") {
        const { error: promoteError } = await supabase.rpc("ensure_platform_superadmin");

        if (promoteError) {
          console.warn("No se pudo reparar el perfil superadmin:", promoteError);
        } else {
          const promoted = await supabase
            .from("profiles")
            .select(PROFILE_SELECT)
            .eq("id", userId)
            .maybeSingle();

          if (promoted.error) throw promoted.error;
          data = promoted.data;
        }
      }

      if (!data) {
        setAuthNotice("No pudimos cargar tu perfil todavía. Recarga la página en unos segundos.");
        return;
      }

      // Diagnóstico de inconsistencias (no auto-corregidas — las
      // resuelve el superadmin desde su panel).
      if (!data.eleam_id && data.rol === "admin_eleam") {
        setAuthNotice("Tu cuenta de admin no tiene un ELEAM asociado. Contacta a soporte.");
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

  // El pago se considera activo si:
  //  - el usuario es superadmin, o
  //  - el ELEAM está en estado 'activo' o 'en_gracia', o
  //  - el ELEAM está 'cancelado' pero todavía dentro del período pagado
  //    (fecha_vencimiento_suscripcion futura).
  // Esto coincide con el trigger sync_pago_activo del backend.
  const eleamGraceUntil = eleam?.fecha_vencimiento_suscripcion
    ? new Date(eleam.fecha_vencimiento_suscripcion)
    : null;
  const inGrace =
    eleam?.subscription_status === "cancelado" &&
    eleamGraceUntil instanceof Date &&
    !Number.isNaN(eleamGraceUntil.valueOf()) &&
    eleamGraceUntil > new Date();

  const pagoActivo =
    profile?.rol === "superadmin" ||
    ["activo", "en_gracia"].includes(eleam?.subscription_status) ||
    inGrace ||
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
  // - superadmin sin ELEAM → /superadmin (operador de la plataforma).
  // - superadmin con ELEAM (cuenta demo) → /dashboard para mostrar la app.
  // - familiar → /familiar.
  // - staff con pago activo → /dashboard.
  // - staff sin pago → /pago.
  let homePath = "/";
  if (user) {
    if (isSuperadmin)            homePath = profile?.eleam_id ? "/dashboard" : "/superadmin";
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
