import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileHomeSheet from "./MobileHomeSheet";
import NavIcon from "../components/NavIcon";

function isActive(path, pathname) {
  if (!path) return false;
  if (path === "/superadmin") return pathname === "/superadmin";
  const base = path.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function MobileBottomNav({ slots, sections, quickActions, auth, onLogout }) {
  const [homeOpen, setHomeOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    navigate(path);
    setHomeOpen(false);
  };

  const items = Array.isArray(slots) ? slots : [];
  if (items.length === 0) return null;

  const gridCols = items.length >= 5 ? "grid-cols-5" : items.length === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden"
      >
        <div className={`mx-auto grid max-w-md ${gridCols} items-end gap-1`}>
          {items.map((slot, idx) => {
            if (slot.type === "home") {
              return (
                <HomeButton
                  key={`home-${idx}`}
                  active={homeOpen}
                  onClick={() => setHomeOpen(true)}
                />
              );
            }
            const item = slot.item;
            if (item.disabled) {
              return <DisabledButton key={item.id} item={item} />;
            }
            return (
              <NavButton
                key={item.id}
                item={item}
                active={isActive(item.path, location.pathname)}
                onClick={() => go(item.path)}
              />
            );
          })}
        </div>
      </nav>

      <MobileHomeSheet
        open={homeOpen}
        onClose={() => setHomeOpen(false)}
        sections={sections}
        auth={auth}
        quickActions={quickActions}
        onLogout={onLogout}
        onNavigate={go}
      />
    </>
  );
}

function NavButton({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-highlight-none flex min-h-12 flex-col items-center justify-end gap-0.5 rounded-2xl px-1 pb-0.5 pt-1 text-[11px] font-medium transition-colors active:bg-slate-100"
      title={item.description}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-2xl transition-all ${
          active
            ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200/80"
            : "bg-transparent text-slate-500"
        }`}
      >
        <NavIcon id={item.icon} className="h-[18px] w-[18px]" />
      </span>
      <span
        className={`max-w-[68px] truncate transition-colors ${
          active ? "text-teal-700 font-semibold" : "text-slate-500"
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}

function DisabledButton({ item }) {
  return (
    <div
      className="flex min-h-12 flex-col items-center justify-end gap-0.5 rounded-2xl px-1 pb-0.5 pt-1 text-[11px] font-medium text-amber-700"
      title={item.description}
    >
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/80">
        <NavIcon id={item.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="max-w-[68px] truncate">{item.label}</span>
    </div>
  );
}

function HomeButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir menú principal"
      aria-expanded={active}
      className="tap-highlight-none mx-auto -mt-7 flex flex-col items-center gap-1"
    >
      <span
        className={`relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br shadow-lg ring-4 ring-white transition-all duration-200 ease-out animate-home-pop active:scale-95 ${
          active
            ? "from-teal-800 to-teal-600 shadow-teal-900/40 scale-105"
            : "from-teal-700 to-teal-600 shadow-teal-900/30"
        }`}
      >
        <NavIcon id="home" className="h-6 w-6 text-white" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-700">
        Inicio
      </span>
    </button>
  );
}
