import React, { createContext, useState, useEffect, useContext } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Loading from "../components/Loading";

const auth = getAuth();

const AuthContext = createContext();
const LoadingContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading }}>
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
