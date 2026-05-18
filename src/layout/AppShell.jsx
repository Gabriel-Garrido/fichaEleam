import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "../context/AuthContext";
import { useNavigationItems } from "../navigation/useNavigationItems";
import { logout } from "../features/auth/authService";
import {
  OnboardingProvider,
  ActivationIntro,
  ActivationPanel,
  ActivationNudge,
} from "../features/onboarding";

export default function AppShell({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { sections, mobileItems, quickActions } = useNavigationItems();
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
          <ActivationNudge />
          <main className="min-h-screen pb-28 lg:pb-0">
            {children ?? <Outlet />}
          </main>
        </div>
        <MobileBottomNav
          items={mobileItems}
          sections={sections}
          quickActions={quickActions}
          auth={auth}
          onLogout={handleLogout}
        />
        <ActivationIntro />
        <ActivationPanel />
      </div>
    </OnboardingProvider>
  );
}

