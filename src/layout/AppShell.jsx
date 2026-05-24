import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "../context/AuthContext";
import { useNavigationItems } from "../navigation/useNavigationItems";
import { logout } from "../features/auth/authService";
import {
  OnboardingProvider,
  ActivationGuide,
} from "../features/onboarding";

export default function AppShell({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { sections, bottomNavSlots, quickActions } = useNavigationItems();
  const [collapsed, setCollapsed] = useState(false);

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
    <OnboardingProvider>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <DesktopSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          sections={sections}
          auth={auth}
          onLogout={handleLogout}
        />
        <div className={`${collapsed ? "lg:pl-20" : "lg:pl-72"} transition-[padding] duration-200`}>
          {auth.featurePermissionsError && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-sm text-amber-800">
                No pudimos cargar tus permisos de acceso. Algunas secciones pueden no estar disponibles.
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
          <main className="min-h-screen pb-28 lg:pb-0">
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
        <ActivationGuide />
      </div>
    </OnboardingProvider>
  );
}

