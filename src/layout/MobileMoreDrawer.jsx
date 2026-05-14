import { useLocation, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "../navigation/navigationConfig";
import NavIcon from "../components/NavIcon";

function isActive(path, pathname) {
  if (!path) return false;
  if (path === "/superadmin") return pathname === "/superadmin";
  const base = path.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

function getInitials(nombre) {
  if (!nombre) return "?";
  return nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function MobileMoreDrawer({ open, onClose, sections, auth, quickActions, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  if (!open) return null;

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const roleLabel = ROLE_LABELS[auth.rol] ?? auth.rol;
  const initials = getInitials(auth.profile?.nombre);
  const isDemo = auth.isAdminEleam && auth.eleam?.plan === "demo";

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        aria-label="Cerrar menú"
        onClick={onClose}
      />

      {/* Drawer sheet */}
      <section
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl animate-slide-up"
        aria-label="Menú de navegación"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        </div>

        <div className="px-4 pb-4">
          {/* ── User profile card ─────────────────────────────── */}
          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white select-none">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{auth.profile?.nombre}</div>
                <div className="truncate text-xs text-slate-500 mt-0.5">{auth.eleam?.nombre || auth.user?.email}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {roleLabel}
              </span>
              {auth.pagoActivo && !isDemo && !auth.isSuperadmin && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Acceso activo
                </span>
              )}
              {isDemo && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  En demo
                </span>
              )}
              {!auth.pagoActivo && !auth.isSuperadmin && !isDemo && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
                  Activación pendiente
                </span>
              )}
            </div>
          </div>

          {/* ── Quick actions ─────────────────────────────────── */}
          {quickActions.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Registrar
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.path)}
                    className="rounded-2xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 active:scale-[0.98]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
                      <NavIcon id={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-slate-900">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Navigation sections ───────────────────────────── */}
          {sections.map((section) => (
            <div key={section.id} className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  item.disabled ? (
                    <div key={item.id} className="rounded-xl bg-amber-50 px-3 py-3 text-sm font-medium text-amber-700">
                      {item.label}
                    </div>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.path)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive(item.path, location.pathname)
                          ? "bg-teal-50 font-semibold text-teal-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${
                        isActive(item.path, location.pathname)
                          ? "bg-teal-700 text-white"
                          : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}>
                        <NavIcon id={item.icon} className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs font-normal text-slate-500">{item.description}</span>
                        )}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          ))}

          {/* ── Logout ───────────────────────────────────────── */}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <span>Cerrar sesión</span>
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
