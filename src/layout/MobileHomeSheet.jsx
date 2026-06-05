import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const ROLE_THEME = {
  admin_eleam: { from: "from-teal-600", to: "to-teal-700", chip: "bg-teal-100 text-teal-800 ring-teal-200" },
  funcionario: { from: "from-violet-600", to: "to-violet-700", chip: "bg-violet-100 text-violet-800 ring-violet-200" },
  familiar:    { from: "from-rose-500",   to: "to-rose-600",   chip: "bg-rose-100 text-rose-800 ring-rose-200" },
  superadmin:  { from: "from-slate-700",  to: "to-slate-900",  chip: "bg-slate-200 text-slate-800 ring-slate-300" },
};

export default function MobileHomeSheet({ open, onClose, sections, auth, quickActions, onLogout, onNavigate }) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const roleLabel = ROLE_LABELS[auth.rol] ?? auth.rol;
  const theme = ROLE_THEME[auth.rol] ?? ROLE_THEME.admin_eleam;
  const initials = getInitials(auth.profile?.nombre);
  const firstName = auth.profile?.nombre?.split(" ")[0] ?? "";
  const isDemo = auth.isAdminEleam && auth.eleam?.plan === "demo";

  const flatNav = useMemo(() => {
    return sections.flatMap((s) =>
      s.items.map((item) => ({ ...item, sectionLabel: s.label, sectionId: s.id }))
    );
  }, [sections]);

  // Las acciones rápidas que llevan a la misma ruta que un ítem del menú son
  // redundantes: se filtran para que cada destino aparezca una sola vez.
  const dedupedQuickActions = useMemo(() => {
    const navPaths = new Set(flatNav.map((item) => item.path));
    return quickActions.filter((action) => !navPaths.has(action.path));
  }, [flatNav, quickActions]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNav = normalizedQuery
    ? flatNav.filter((item) => item.label?.toLowerCase().includes(normalizedQuery))
    : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Vista principal">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <section
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 flex max-h-[94vh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-slide-up"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="h-1.5 w-11 rounded-full bg-slate-200" aria-hidden="true" />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {/* ── Greeting card ──────────────────────────────────── */}
          <header className={`relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} px-4 py-4 text-white shadow-lg`}>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-base font-bold ring-1 ring-white/20 backdrop-blur-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
                  {getGreeting()}
                </p>
                <p className="truncate text-lg font-semibold leading-tight">
                  {firstName || auth.profile?.nombre || "Bienvenido"}
                </p>
                <p className="truncate text-[12px] text-white/80">
                  {auth.eleam?.nombre || auth.user?.email}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${theme.chip}`}>
                {roleLabel}
              </span>
              {auth.pagoActivo && !isDemo && !auth.isSuperadmin && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Acceso activo
                </span>
              )}
              {isDemo && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  En demo
                </span>
              )}
              {!auth.pagoActivo && !auth.isSuperadmin && !isDemo && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200">
                  Activación pendiente
                </span>
              )}
            </div>
          </header>

          {/* ── Search ────────────────────────────────────────── */}
          <label className="relative mb-4 block">
            <span className="sr-only">Buscar en el menú</span>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el menú…"
              className="w-full min-h-11 rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          {/* ── Filtered results ──────────────────────────────── */}
          {filteredNav && (
            <div className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Resultados ({filteredNav.length})
              </p>
              {filteredNav.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Sin resultados para "{query}"
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {filteredNav.map((item) =>
                    item.disabled ? (
                      <DisabledTile key={item.id} item={item} />
                    ) : (
                      <LauncherTile
                        key={item.id}
                        item={item}
                        active={isActive(item.path, location.pathname)}
                        onClick={() => onNavigate(item.path)}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Default view (no query) ───────────────────────── */}
          {!filteredNav && (
            <>
              {dedupedQuickActions.length > 0 && (
                <div className="mb-5">
                  <SectionLabel icon="⚡" label="Acciones rápidas" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {dedupedQuickActions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.path)}
                        className="tap-highlight-none flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-all active:scale-[0.98] active:bg-slate-50 hover:border-teal-200 hover:bg-teal-50/40"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                          <NavIcon id={item.icon} className="h-5 w-5" />
                        </span>
                        <span className="block">
                          <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sections.map((section) => (
                <div key={section.id} className="mb-5">
                  <SectionLabel label={section.label} />
                  <div className="grid grid-cols-4 gap-2">
                    {section.items.map((item) =>
                      item.disabled ? (
                        <DisabledTile key={item.id} item={item} />
                      ) : (
                        <LauncherTile
                          key={item.id}
                          item={item}
                          active={isActive(item.path, location.pathname)}
                          onClick={() => onNavigate(item.path)}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Logout ───────────────────────────────────────── */}
          <button
            type="button"
            onClick={onLogout}
            className="tap-highlight-none mt-2 flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ label, icon }) {
  return (
    <p className="mb-2 px-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </p>
  );
}

function LauncherTile({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-highlight-none group flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition-all active:scale-[0.95]"
      title={item.description}
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl transition-all ${
          active
            ? "bg-teal-700 text-white shadow-sm shadow-teal-900/20"
            : "bg-slate-100 text-slate-700 group-active:bg-slate-200"
        }`}
      >
        <NavIcon id={item.icon} className="h-5 w-5" />
      </span>
      <span
        className={`block min-h-[1.8rem] w-full overflow-hidden text-[10px] leading-[0.9rem] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
          active ? "font-semibold text-teal-800" : "font-medium text-slate-700"
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}

function DisabledTile({ item }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center opacity-70"
      title={item.description}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/80">
        <NavIcon id={item.icon} className="h-5 w-5" />
      </span>
      <span className="block min-h-[1.8rem] w-full overflow-hidden text-[10px] leading-[0.9rem] font-medium text-amber-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {item.label}
      </span>
    </div>
  );
}
