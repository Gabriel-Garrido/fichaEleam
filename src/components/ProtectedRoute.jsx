import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import SupabaseError from "./SupabaseError";

/**
 * ProtectedRoute
 *
 *   <ProtectedRoute>...</ProtectedRoute>                  → solo sesión + cuenta activa
 *   <ProtectedRoute requireActive={false}>                → permite cuenta sin pago
 *   <ProtectedRoute allowedRoles={["admin_eleam"]}>       → restringe por rol
 *
 * Si el usuario no cumple las condiciones, redirige a la home apropiada
 * para su rol (homePath de AuthContext) — nunca a una ruta que no le
 * corresponde, evitando loops y mostrando algo coherente.
 */
function ProtectedRoute({
  children,
  requireActive = true,
  allowedRoles = null,
}) {
  const location = useLocation();
  const {
    user, profile, authLoading, profileLoading, pagoActivo,
    supabaseError, homePath, isSuperadmin, isFamiliar,
  } = useAuth();

  if (authLoading || profileLoading) return <Loading message="Verificando sesión..." />;
  if (supabaseError) return <SupabaseError />;

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
    return <Navigate to="/pago?sinAcceso=1" replace />;
  }

  // El familiar y el superadmin no se rigen por pagoActivo del ELEAM
  // del mismo modo: superadmin siempre activo; familiar depende del
  // ELEAM al que pertenece (mismo flag pagoActivo).
  if (requireActive && !pagoActivo && !isFamiliar) {
    return <Navigate to="/pago?sinAcceso=1" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.rol)) {
    // Si el rol no coincide, mandamos al home propio del rol.
    return <Navigate to={homePath} replace />;
  }

  // El familiar nunca debería entrar a rutas operativas del staff.
  // Si llegó aquí por azar, lo mandamos al portal familiar.
  if (isFamiliar && !location.pathname.startsWith("/familiar")) {
    if (!allowedRoles?.includes("familiar")) {
      return <Navigate to="/familiar" replace />;
    }
  }

  // Superadmin tiene su panel; no se le obliga a entrar al dashboard
  // de ELEAM (no tiene ELEAM). Si entra a una ruta de staff, redirigir.
  if (isSuperadmin && !["/superadmin"].some((p) => location.pathname.startsWith(p))) {
    if (!allowedRoles?.includes("superadmin")) {
      return <Navigate to="/superadmin" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
