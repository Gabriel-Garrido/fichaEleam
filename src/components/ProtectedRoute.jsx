import { Navigate, Link, useLocation } from "react-router-dom";
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
  requiredFeature = null,
  requiredPermission = null,
  requiredAnyPermission = null,
  allowSuperadmin = true,
}) {
  const location = useLocation();
  const {
    user, profile, authLoading, profileLoading, pagoActivo,
    supabaseError, homePath, isSuperadmin, mustResetPassword, canFeature, can,
  } = useAuth();

  if (authLoading || (profileLoading && !profile)) return <Loading message="Verificando sesión..." />;
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

  if (requiredFeature && !canFeature(requiredFeature)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Área no habilitada</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tu cuenta no tiene habilitada esta área. Pide al administrador que revise los permisos.
          </p>
          <NavigateButton to={homePath} />
        </div>
      </div>
    );
  }

  if (!allowSuperadmin && isSuperadmin) {
    return <Navigate to={homePath} replace />;
  }

  const missingActionPermission = requiredPermission && !can(requiredPermission);
  const missingAnyPermission = requiredAnyPermission?.length
    && !requiredAnyPermission.some((permission) => can(permission));
  if (missingActionPermission || missingAnyPermission) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Acción no autorizada</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puedes usar el área, pero tu cuenta no tiene permiso para abrir esta acción.
          </p>
          <NavigateButton to={homePath} />
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;

function NavigateButton({ to }) {
  return (
    <Link
      to={to || "/"}
      className="mt-6 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
    >
      Volver
    </Link>
  );
}
