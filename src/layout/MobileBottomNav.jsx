import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileMoreDrawer from "./MobileMoreDrawer";
import NavIcon from "../components/NavIcon";

function isActive(path, pathname) {
  if (!path) return false;
  if (path === "/superadmin") return pathname === "/superadmin";
  const base = path.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function MobileBottomNav({ items, sections, quickActions, auth, onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    navigate(path);
    setQuickOpen(false);
    setMoreOpen(false);
  };

  return (
    <>
      {/* ── Quick actions sheet ──────────────────────────────── */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
            aria-label="Cerrar acciones rápidas"
            onClick={() => setQuickOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <p className="mb-3 text-sm font-bold text-slate-900">Registrar</p>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.path)}
                  className="rounded-2xl border border-slate-200 p-3.5 text-left transition-colors hover:bg-slate-50 active:scale-[0.98]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <NavIcon id={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="mt-2.5 block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom nav bar ───────────────────────────────────── */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.07)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {/* First 2 nav items */}
          {items.slice(0, 2).map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={isActive(item.path, location.pathname)}
              onClick={() => go(item.path)}
            />
          ))}

          {/* Center FAB */}
          <button
            type="button"
            onClick={() => quickActions.length ? setQuickOpen(true) : setMoreOpen(true)}
            className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/30 ring-4 ring-white transition-transform active:scale-95"
            aria-label="Registrar"
            title="Registrar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* 3rd nav item */}
          {items.slice(2, 3).map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={isActive(item.path, location.pathname)}
              onClick={() => go(item.path)}
            />
          ))}

          {/* Más button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-medium text-slate-500 transition-colors"
          >
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
              </svg>
            </span>
            Más
          </button>
        </div>
      </nav>

      <MobileMoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        sections={sections}
        auth={auth}
        quickActions={quickActions}
        onLogout={onLogout}
      />
    </>
  );
}

function NavButton({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
        active ? "text-teal-700" : "text-slate-500"
      }`}
      title={item.description}
    >
      <span className={`grid h-7 w-7 place-items-center rounded-xl transition-colors ${
        active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
      }`}>
        <NavIcon id={item.icon} className="h-4 w-4" />
      </span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}
