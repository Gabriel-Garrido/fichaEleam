import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileMoreDrawer from "./MobileMoreDrawer";

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
      {quickOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/30"
            aria-label="Cerrar acciones rápidas"
            onClick={() => setQuickOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-3 text-sm font-semibold text-slate-950">Registrar</div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.path)}
                  className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-base font-semibold text-teal-800">
                    {item.icon}
                  </span>
                  <span className="mt-2 block text-sm font-semibold text-slate-950">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {items.slice(0, 2).map((item) => (
            <NavButton key={item.id} item={item} active={isActive(item.path, location.pathname)} onClick={() => go(item.path)} />
          ))}
          <button
            type="button"
            onClick={() => quickActions.length ? setQuickOpen(true) : setMoreOpen(true)}
            className="mx-auto -mt-7 grid h-16 w-16 place-items-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/25 ring-4 ring-white"
            aria-label="Registrar"
            title="Registrar"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
          {items.slice(2, 3).map((item) => (
            <NavButton key={item.id} item={item} active={isActive(item.path, location.pathname)} onClick={() => go(item.path)} />
          ))}
          {items.length < 4 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="rounded-2xl px-1 py-1.5 text-center text-[11px] font-medium text-slate-600"
            >
              <span className="mx-auto mb-0.5 grid h-6 w-6 place-items-center rounded-lg bg-slate-100">⋯</span>
              Más
            </button>
          )}
          {items.length >= 4 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="rounded-2xl px-1 py-1.5 text-center text-[11px] font-medium text-slate-600"
            >
              <span className="mx-auto mb-0.5 grid h-6 w-6 place-items-center rounded-lg bg-slate-100">⋯</span>
              Más
            </button>
          )}
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
      className={`rounded-2xl px-1 py-1.5 text-center text-[11px] font-medium ${
        active ? "text-teal-800" : "text-slate-600"
      }`}
      title={item.description}
    >
      <span className={`mx-auto mb-0.5 grid h-6 w-6 place-items-center rounded-lg ${
        active ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"
      }`}>
        {item.icon}
      </span>
      <span className="block truncate">{item.label}</span>
    </button>
  );
}
