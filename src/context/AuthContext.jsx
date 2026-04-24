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

  const fetchProfileAndEleam = useCallback(async (userId) => {
    if (!supabase) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, eleams(*)")
        .eq("id", userId)
        .single();

      if (error || !data) { setProfileLoading(false); return; }

      // Si el usuario no tiene ELEAM asociado, crear uno automáticamente
      if (!data.eleam_id) {
        const { data: newEleam } = await supabase
          .from("eleams")
          .insert({
            nombre: `ELEAM de ${data.nombre}`,
            email_admin: data.email,
            pago_activo: false,
          })
          .select()
          .single();

        if (newEleam) {
          await supabase
            .from("profiles")
            .update({ eleam_id: newEleam.id, rol: "admin_eleam" })
            .eq("id", userId);
          data.eleam_id = newEleam.id;
          data.eleams   = newEleam;
          data.rol      = "admin_eleam";
        }
      }

      setProfile(data);
      setEleam(data.eleams ?? null);
    } catch {
      // perfil todavía no disponible (trigger puede tardar ms)
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
        if (session?.user) fetchProfileAndEleam(session.user.id);
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
          fetchProfileAndEleam(session.user.id);
        } else {
          setProfile(null);
          setEleam(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfileAndEleam]);

  // El pago se considera activo si el ELEAM tiene pago_activo=true
  // o si el usuario tiene rol 'superadmin' (usuario de prueba)
  const pagoActivo =
    profile?.rol === "superadmin" ||
    eleam?.pago_activo === true;

  const value = {
    user,
    profile,
    eleam,
    pagoActivo,
    profileLoading,
    authLoading,
    supabaseError: supabaseError || !isSupabaseConfigured,
    refetchProfile: () => user && fetchProfileAndEleam(user.id),
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
