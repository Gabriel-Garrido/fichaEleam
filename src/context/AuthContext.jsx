import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseConfig";
import Loading from "../components/Loading";
import { computeCanFeature, resolveFeatureHomePath } from "./featureAccess";
import { FEATURE_CATALOG } from "../features/permissions/featureCatalog";

const AuthContext = createContext();

const AUTH_NOTICE_STORAGE_KEY = "fichaeleam_auth_notice";

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

function purgeRetiredGuidanceKeys() {
  if (typeof window === "undefined") return;
  try {
    const prefixes = [
      "fichaeleam_activation_v1_",
      "fichaeleam_onboarding_v2_",
      "fichaeleam_welcome_v1_",
      "fichaeleam_coach_v1_",
    ];
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) toRemove.push(key);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // localStorage puede no estar disponible en algunos contextos
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [eleam, setEleam]             = useState(null);
  const [permisos, setPermisos]       = useState(null);
  const [featurePermissions, setFeaturePermissions] = useState(null);
  const [featurePermissionsError, setFeaturePermissionsError] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [supabaseError, setSupabaseError]   = useState(false);
  const [authNotice, setAuthNotice]         = useState(() => takeStoredAuthNotice());
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const fetchProfileAndEleam = useCallback(async (authUser, { silent = false } = {}) => {
    if (!supabase) return;
    const userId = typeof authUser === "string" ? authUser : authUser?.id;
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

      if (!data) {
        const message = "No encontramos una cuenta habilitada para este correo. Pide al administrador del ELEAM que cree tu acceso.";
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
      } else if (!data.eleam_id && data.rol === "funcionario") {
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

      // Permisos por área: controlan menú, enlaces, rutas y RLS. Para un
      // funcionario cada área debe tener una fila explícita habilitada.
      try {
        if (data.eleam_id && data.rol !== "superadmin") {
          const profileFeatureQuery = data.rol === "funcionario"
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

          const eleamMap = Object.fromEntries(
            (eleamFeatures.data ?? []).map((row) => [row.feature_id, row.enabled !== false]),
          );
          const featureMap = data.rol === "funcionario"
            ? Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.id, false]))
            : { ...eleamMap };
          for (const row of profileFeatures.data ?? []) {
            featureMap[row.feature_id] = row.enabled === true;
          }
          for (const [featureId, enabled] of Object.entries(eleamMap)) {
            if (!enabled) featureMap[featureId] = false;
          }
          setFeaturePermissions(featureMap);
        } else {
          setFeaturePermissions({});
        }
        setFeaturePermissionsError(false);
      } catch (featureError) {
        console.warn("No se pudieron cargar permisos por feature:", featureError);
        // Fail-closed: sin permisos por feature confiables, canFeature bloquea
        // las features protegidas hasta que el usuario reintente.
        setFeaturePermissions(null);
        setFeaturePermissionsError(true);
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
          if (event === "SIGNED_IN") {
            const hasCurrentProfile = profileRef.current?.id === session.user.id;
            fetchProfileAndEleam(session.user, { silent: hasCurrentProfile });
          } else if (event === "USER_UPDATED") {
            fetchProfileAndEleam(session.user, { silent: true });
          } else if (event === "TOKEN_REFRESHED") {
            fetchProfileAndEleam(session.user, { silent: true });
          }
        } else {
          setProfile(null);
          setEleam(null);
          setPermisos(null);
          setFeaturePermissions(null);
          setAuthNotice(takeStoredAuthNotice());
          purgeRetiredGuidanceKeys();
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
  const isSuperadmin  = rol === "superadmin";
  const isStaff       = isAdminEleam || isFuncionario;

  const mustResetPassword = profile?.must_reset_password === true;

  // Verificar si el usuario actual tiene el permiso indicado.
  // admin_eleam y superadmin siempre retornan true.
  // funcionario: consulta la tabla funcionario_permisos cargada en contexto.
  const can = useCallback((perm) => {
    if (isSuperadmin || isAdminEleam) return true;
    if (!isFuncionario) return false;
    if (!permisos) return false;
    return permisos[perm] === true;
  }, [isSuperadmin, isAdminEleam, isFuncionario, permisos]);

  // Fail-closed ante error de carga de permisos por feature. La lógica vive
  // en featureAccess.js para poder probarla sin renderizar AuthProvider.
  const canFeature = useCallback(
    (featureId) => computeCanFeature({
      featureId,
      isSuperadmin,
      isAdminEleam,
      isFuncionario,
      featurePermissions,
      featurePermissionsError,
    }),
    [featurePermissions, featurePermissionsError, isAdminEleam, isFuncionario, isSuperadmin],
  );

  const refetchProfile = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return fetchProfileAndEleam(user);
  }, [fetchProfileAndEleam, user]);

  // Ruta inicial según rol/estado de suscripción.
  // - superadmin sin ELEAM → /superadmin (operador de la plataforma).
  // - superadmin con ELEAM (cuenta demo) → /dashboard para mostrar la app.
  // - staff sin acceso vigente → /pago con bloqueo informativo.
  let homePath = "/";
  if (user) {
    if (isSuperadmin)            homePath = profile?.eleam_id ? "/dashboard" : "/superadmin";
    else if (pagoActivo) homePath = resolveFeatureHomePath(canFeature);
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
    isSuperadmin,
    isStaff,
    homePath,
    permisos,
    featurePermissions,
    featurePermissionsError,
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
    isAdminEleam, isFuncionario, isSuperadmin, isStaff,
    homePath, permisos, featurePermissions, featurePermissionsError, can, canFeature,
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

export const useAuth    = () => useContext(AuthContext);
export { AuthContext };
export { LoadingProvider, useLoading, LoadingContext } from "./LoadingContext";
