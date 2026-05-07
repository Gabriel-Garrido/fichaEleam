import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import SupabaseError from "./SupabaseError";

/**
 * ProtectedRoute
 *
 *   <ProtectedRoute>...</ProtectedRoute>                  → solo sesión + cuenta activa
 *   <ProtectedRoute requireActive={false}>                → solo para pago/cambio de clave
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
    supabaseError, homePath, isSuperadmin, isFamiliar, mustResetPassword,
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

  // Forzar cambio de contraseña en el primer acceso (usuarios creados directamente por el admin).
  // Permitir /cambiar-clave para evitar loop infinito.
  if (mustResetPassword && location.pathname !== "/cambiar-clave") {
    return <Navigate to="/cambiar-clave" replace />;
  }

  // El acceso operativo depende del estado vigente del ELEAM. Superadmin
  // ya viene como pagoActivo=true desde AuthContext.
  if (requireActive && !pagoActivo) {
    return <Navigate to="/pago?sinAcceso=1" replace />;
  }

  // El superadmin tiene acceso universal — la RLS sigue filtrando los
  // datos que ve. Esto también permite que el usuario demo (superadmin
  // con eleam_id) navegue todas las vistas operativas.
  if (allowedRoles?.length && !allowedRoles.includes(profile.rol) && !isSuperadmin) {
    return <Navigate to={homePath} replace />;
  }

  // El familiar nunca debe entrar a rutas operativas del staff: si la
  // ruta no lo declara explícitamente, lo devolvemos a su portal.
  if (isFamiliar && !allowedRoles?.includes("familiar")) {
    return <Navigate to="/familiar" replace />;
  }

  return children;
}

export default ProtectedRoute;
