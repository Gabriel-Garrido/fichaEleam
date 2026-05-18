import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseConfig";
import Loading from "../components/Loading";

const AuthContext = createContext();
const LoadingContext = createContext();
const PLATFORM_SUPERADMIN_EMAILS = new Set(["gabrielgarrido89@gmail.com"]);

// Permisos que deben negar acceso por defecto cuando no hay row en funcionario_permisos.
// Coincide con los campos que tienen DEFAULT FALSE en BD.
const FAIL_CLOSED_PERMS = new Set([
  "eliminar_residentes",
  "eliminar_signos_vitales",
  "eliminar_observaciones",
  "archivar_acreditacion",
  "validar_medicamentos_controlados",
  "ajustar_stock_medicamentos",
  "crear_indicaciones_medicamentos",
  "editar_indicaciones_medicamentos",
  "editar_indicaciones_cuidado",
]);
const AUTH_NOTICE_STORAGE_KEY = "fichaeleam_auth_notice";

function isPlatformSuperadminEmail(email) {
  return PLATFORM_SUPERADMIN_EMAILS.has((email || "").trim().toLowerCase());
}

function takeStoredAuthNotice() {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
  if (value) window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  return value;
}

function storeAuthNotice(message) {
  if (typeof window === "undefined" || !message) return;
  window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [eleam, setEleam]             = useState(null);
  const [permisos, setPermisos]       = useState(null);
  const [featurePermissions, setFeaturePermissions] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [supabaseError, setSupabaseError]   = useState(false);
  const [authNotice, setAuthNotice]         = useState(() => takeStoredAuthNotice());

  const fetchProfileAndEleam = useCallback(async (authUser, { silent = false } = {}) => {
    if (!supabase) return;
    const userId = typeof authUser === "string" ? authUser : authUser?.id;
    const userEmail = typeof authUser === "string" ? "" : authUser?.email;
    if (!userId) return;

    if (!silent) setProfileLoading(true);
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
        id, nombre, email, rol, eleam_id, creado_en, must_reset_password,
        eleams!profiles_eleam_id_fkey (
          id, nombre, email_admin, telefono, plan, plan_id,
          subscription_status, pago_activo, mp_preapproval_id, mp_payer_email,
          proximo_cobro_en, cancelado_en, fecha_vencimiento_suscripcion,
          max_residentes, max_funcionarios, fecha_pago, creado_en,
          planes (
            id, codigo, nombre, descripcion, precio_clp, max_residentes,
            max_funcionarios, frequency, frequency_type, activo, orden, destacado
          )
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
        const message = "No encontramos una cuenta habilitada para este correo. Si solicitaste demo, el login se habilita cuando el equipo apruebe tu cuenta; si eres funcionario o familiar, pide que creen tu usuario.";
        storeAuthNotice(message);
        setAuthNotice(message);
        setProfile(null);
        setEleam(null);
        setPermisos(null);
        setFeaturePermissions(null);
        await supabase.auth.signOut();
        return;
      }

      // Diagnostico de inconsistencias: una cuenta sin ELEAM no debe
      // quedar autenticada en la app, salvo superadmin plataforma.
      if (!data.eleam_id && data.rol === "admin_eleam") {
        const message = "Tu cuenta de administrador no tiene un ELEAM asociado. Contacta a soporte para revisar la activación.";
        storeAuthNotice(message);
        setAuthNotice(message);
        await supabase.auth.signOut();
        return;
      } else if (!data.eleam_id && (data.rol === "funcionario" || data.rol === "familiar")) {
        const message = "Tu cuenta no tiene un ELEAM asociado. Contacta al administrador del establecimiento.";
        storeAuthNotice(message);
        setAuthNotice(message);
        await supabase.auth.signOut();
        return;
      }

      setProfile(data);
      setEleam(data.eleams ?? null);

      // Cargar permisos granulares solo para funcionarios
      if (data.rol === "funcionario") {
        const { data: perms } = await supabase
          .from("funcionario_permisos")
          .select("*")
          .eq("profile_id", data.id)
          .maybeSingle();
        setPermisos(perms ?? null);
      } else {
        setPermisos(null);
      }

      // Permisos por feature: controlan sidebar y acceso directo a rutas.
      // Una fila ausente significa feature habilitada por defecto.
      try {
        if (data.eleam_id && data.rol !== "superadmin") {
          const profileFeatureQuery = data.rol === "funcionario" || data.rol === "familiar"
            ? supabase
                .from("profile_feature_permissions")
                .select("feature_id, enabled")
                .eq("profile_id", data.id)
            : Promise.resolve({ data: [], error: null });

          const [eleamFeatures, profileFeatures] = await Promise.all([
            supabase
              .from("eleam_feature_permissions")
              .select("feature_id, enabled")
              .eq("eleam_id", data.eleam_id)
              .eq("rol", data.rol),
            profileFeatureQuery,
          ]);

          if (eleamFeatures.error) throw eleamFeatures.error;
          if (profileFeatures.error) throw profileFeatures.error;

          const featureMap = {};
          for (const row of eleamFeatures.data ?? []) featureMap[row.feature_id] = row.enabled !== false;
          for (const row of profileFeatures.data ?? []) featureMap[row.feature_id] = row.enabled !== false;
          setFeaturePermissions(featureMap);
        } else {
          setFeaturePermissions({});
        }
      } catch (featureError) {
        console.warn("No se pudieron cargar permisos por feature:", featureError);
        setFeaturePermissions({});
      }
    } catch (error) {
      console.warn("No se pudo cargar el perfil:", error);
      setAuthNotice("Iniciaste sesión, pero no pudimos cargar todos los datos de tu cuenta.");
    } finally {
      if (!silent) setProfileLoading(false);
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
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === "SIGNED_IN" || event === "USER_UPDATED") {
            fetchProfileAndEleam(session.user);
          } else if (event === "TOKEN_REFRESHED") {
            fetchProfileAndEleam(session.user, { silent: true });
          }
        } else {
          setProfile(null);
          setEleam(null);
          setPermisos(null);
          setFeaturePermissions(null);
          setAuthNotice(takeStoredAuthNotice());
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfileAndEleam]);

  // El pago se considera activo si:
  //  - el usuario es superadmin, o
  //  - el ELEAM está en estado 'activo' o 'en_gracia', o
  //  - el ELEAM demo inició un pago y sigue dentro del período demo, o
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
  const pendingDemoAccess =
    eleam?.plan === "demo" &&
    eleam?.subscription_status === "pendiente" &&
    eleamGraceUntil instanceof Date &&
    !Number.isNaN(eleamGraceUntil.valueOf()) &&
    eleamGraceUntil > new Date();

  const pagoActivo =
    profile?.rol === "superadmin" ||
    ["activo", "en_gracia"].includes(eleam?.subscription_status) ||
    pendingDemoAccess ||
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

  const mustResetPassword = profile?.must_reset_password === true;

  // Verificar si el usuario actual tiene el permiso indicado.
  // admin_eleam y superadmin siempre retornan true.
  // funcionario: consulta la tabla funcionario_permisos cargada en contexto.
  const can = useCallback((perm) => {
    if (isSuperadmin || isAdminEleam) return true;
    if (!isFuncionario) return false;
    if (!permisos) {
      return !FAIL_CLOSED_PERMS.has(perm);
    }
    return permisos[perm] === true;
  }, [isSuperadmin, isAdminEleam, isFuncionario, permisos]);

  const canFeature = useCallback((featureId) => {
    if (!featureId) return true;
    if (isSuperadmin) return true;
    if (!featurePermissions) return true;
    return featurePermissions[featureId] !== false;
  }, [featurePermissions, isSuperadmin]);

  const refetchProfile = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return fetchProfileAndEleam(user);
  }, [fetchProfileAndEleam, user]);

  // Ruta inicial según rol/estado de suscripción.
  // - superadmin sin ELEAM → /superadmin (operador de la plataforma).
  // - superadmin con ELEAM (cuenta demo) → /dashboard para mostrar la app.
  // - familiar con ELEAM activo → /familiar.
  // - staff/familiar sin acceso vigente → /pago con bloqueo informativo.
  let homePath = "/";
  if (user) {
    if (isSuperadmin)            homePath = profile?.eleam_id ? "/dashboard" : "/superadmin";
    else if (isFamiliar)         homePath = pagoActivo ? "/familiar" : "/pago?sinAcceso=1";
    else if (pagoActivo)         homePath = "/dashboard";
    else                         homePath = "/pago?sinAcceso=1";
  }

  // Memoize the context value to prevent all consumers from re-rendering on
  // every AuthProvider render that doesn't change auth state.
  const value = useMemo(() => ({
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
    permisos,
    featurePermissions,
    can,
    canFeature,
    mustResetPassword,
    profileLoading,
    authLoading,
    authNotice,
    supabaseError: supabaseError || !isSupabaseConfigured,
    refetchProfile,
  }), [
    user, profile, eleam, plan, subscriptionStatus, pagoActivo, rol,
    isAdminEleam, isFuncionario, isFamiliar, isSuperadmin, isStaff,
    homePath, permisos, featurePermissions, can, canFeature,
    mustResetPassword, profileLoading, authLoading, authNotice,
    supabaseError, refetchProfile,
  ]);

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
