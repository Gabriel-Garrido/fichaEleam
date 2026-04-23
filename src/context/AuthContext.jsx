import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../services/supabaseConfig";
import Loading from "../components/Loading";

const AuthContext = createContext();
const LoadingContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  };

  return (
    <AuthContext.Provider value={{ user, profile, setUser, authLoading }}>
      {authLoading ? <Loading message="Verificando autenticación..." /> : children}
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

export function useAuth() {
  return useContext(AuthContext);
}

export function useLoading() {
  return useContext(LoadingContext);
}

export { AuthContext, LoadingContext };
