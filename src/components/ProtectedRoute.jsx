import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import SupabaseError from "./SupabaseError";

function ProtectedRoute({ children }) {
  const { user, authLoading, profileLoading, pagoActivo, supabaseError } = useAuth();

  if (authLoading || profileLoading) return <Loading message="Verificando sesión..." />;
  if (supabaseError)  return <SupabaseError />;
  if (!user)          return <Navigate to="/login" replace />;
  if (!pagoActivo)    return <Navigate to="/pago?sinAcceso=1" replace />;

  return children;
}

export default ProtectedRoute;
