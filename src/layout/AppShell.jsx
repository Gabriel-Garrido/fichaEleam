import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "../context/AuthContext";
import { useNavigationItems } from "../navigation/useNavigationItems";
import { logout } from "../features/auth/authService";
import { getPrivateRouteTitle } from "../routes/privateRouteMetadata";

export default function AppShell({ children }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sections, bottomNavSlots, quickActions } = useNavigationItems();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.title = `${getPrivateRouteTitle(location.pathname)} · FichaEleam`;

    // Las vistas con información privada nunca deben heredar el "index, follow"
    // de una página pública prerenderizada al abrir o recargar una URL interna.
    const robots = document.head.querySelector('meta[name="robots"]');
    robots?.setAttribute("content", "noindex, nofollow");
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (!auth.user) return children ?? <Outlet />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        sections={sections}
        auth={auth}
        onLogout={handleLogout}
      />
      <div className={`min-w-0 max-w-full overflow-x-hidden ${collapsed ? "lg:pl-20" : "lg:pl-72"} transition-[padding] duration-200`}>
        {(auth.featurePermissionsError || auth.permissionsError) && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5"
          >
            <p className="text-sm text-amber-800">
              No pudimos verificar todos tus permisos. Por seguridad, algunas secciones o acciones están temporalmente bloqueadas.
            </p>
            <button
              type="button"
              onClick={() => auth.refetchProfile()}
              className="text-sm font-semibold text-amber-900 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}
        <main className="min-h-screen min-w-0 max-w-full overflow-x-hidden pb-28 lg:pb-0">
          {children ?? <Outlet />}
        </main>
      </div>
      <MobileBottomNav
        slots={bottomNavSlots}
        sections={sections}
        quickActions={quickActions}
        auth={auth}
        onLogout={handleLogout}
      />
    </div>
  );
}

