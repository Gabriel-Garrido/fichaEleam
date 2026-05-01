import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import SupabaseError from "./SupabaseError";

function ProtectedRoute({
  children,
  requireActive = true,
  allowedRoles = null,
  inactiveRedirect = "/pago?sinAcceso=1",
}) {
  const location = useLocation();
  const {
    user,
    profile,
    authLoading,
    profileLoading,
    pagoActivo,
    supabaseError,
  } = useAuth();

  if (authLoading || profileLoading) return <Loading message="Verificando sesión..." />;
  if (supabaseError)  return <SupabaseError />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!profile) {
    return <Navigate to={inactiveRedirect} replace />;
  }

  if (requireActive && !pagoActivo) {
    return <Navigate to={inactiveRedirect} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.rol)) {
    const fallback = pagoActivo ? "/dashboard" : inactiveRedirect;
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default ProtectedRoute;
