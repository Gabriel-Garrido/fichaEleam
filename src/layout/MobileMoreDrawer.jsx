import { useLocation, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "../navigation/navigationConfig";
import NavIcon from "../components/NavIcon";

function active(path, pathname) {
  if (!path) return false;
  if (path === "/superadmin") return pathname === "/superadmin";
  const base = path.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function MobileMoreDrawer({
  open,
  onClose,
  sections,
  auth,
  quickActions,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  if (!open) return null;

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button        type="button"
        className="absolute inset-0 bg-slate-950/35"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <section className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 rounded-2xl bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-950">{auth.profile?.nombre}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{auth.eleam?.nombre || auth.user?.email}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {ROLE_LABELS[auth.rol] ?? auth.rol}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              auth.pagoActivo ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
            }`}>
              {auth.pagoActivo ? "Acceso activo" : "Activación pendiente"}
            </span>
          </div>
        </div>

        {quickActions.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Registrar
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((item) => (
                <button
                  type="button"

                  key={item.id}
                  type="button"
                  onClick={() => go(item.path)}
                  className="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-800">
                    <NavIcon id={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="mt-2 block text-sm font-semibold text-slate-950">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.id} className="mb-5">
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => item.disabled ? (
                <div key={item.id} className="rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  {item.label}
                </div>
              ) : (
                <button
                  type="button"

                  key={item.id}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm ${
                    active(item.path, location.pathname)
                      ? "bg-teal-50 font-semibold text-teal-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-white ring-1 ring-slate-200 text-slate-600">
                    <NavIcon id={item.icon} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block">{item.label}</span>
                    {item.description && <span className="block text-xs font-normal text-slate-500">{item.description}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button          type="button"
          onClick={onLogout}
          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Cerrar sesión
          <span>↪</span>
        </button>
      </section>
    </div>
  );
}
