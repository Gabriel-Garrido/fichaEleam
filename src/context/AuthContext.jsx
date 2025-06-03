import React, { createContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext useEffect triggered");
    console.log("Firebase auth object:", auth);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("onAuthStateChanged callback executed");
      console.log("Current user:", currentUser);
      if (currentUser) {
        console.log("Usuario autenticado:", currentUser);
      } else {
        console.log("No hay usuario autenticado");
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      console.log("AuthContext cleanup triggered");
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
