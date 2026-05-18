import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "../navigation/navigationConfig";
import NavIcon from "../components/NavIcon";

const HOVER_PREVIEW_DELAY_MS = 300;

function isActive(path, pathname) {
  if (!path) return false;
  if (path === "/superadmin") return pathname === "/superadmin";
  const base = path.split("?")[0];
  return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
}

function getInitials(nombre) {
  if (!nombre) return "?";
  return nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function DesktopSidebar({ collapsed, onToggle, sections, auth, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const roleLabel = ROLE_LABELS[auth.rol] ?? auth.rol;
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTimer = useRef(null);
  const isPinnedOpen = !collapsed;
  const expanded = isPinnedOpen || previewOpen;
  const initials = getInitials(auth.profile?.nombre);
  const isDemo = auth.isAdminEleam && auth.eleam?.plan === "demo";

  const clearPreviewTimer = () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
  };

  const schedulePreviewOpen = () => {
    if (isPinnedOpen || previewOpen) return;
    clearPreviewTimer();
    previewTimer.current = window.setTimeout(() => setPreviewOpen(true), HOVER_PREVIEW_DELAY_MS);
  };

  const handleMouseEnter = () => schedulePreviewOpen();
  const handleMouseLeave = () => { clearPreviewTimer(); setPreviewOpen(false); };
  const handleFocus = () => schedulePreviewOpen();
  const handleBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearPreviewTimer();
    setPreviewOpen(false);
  };

  useEffect(() => () => { if (previewTimer.current) window.clearTimeout(previewTimer.current); }, []);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-slate-200/80 bg-white shadow-sm transition-[width] duration-200 ease-out lg:flex lg:flex-col ${
        expanded ? "w-72" : "w-20"
      }`}
    >
      {/* ── Brand header ─────────────────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <button
          type="button"
          onClick={() => navigate(auth.homePath || "/dashboard")}
          className="min-w-0 rounded-xl p-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          title="Inicio"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            {expanded && (
              <div className="min-w-0">
                <div className="text-[15px] font-black leading-none tracking-tight text-slate-950">FichaEleam</div>
                <div className="mt-0.5 text-[10px] font-medium text-slate-400">Gestión ELEAM</div>
              </div>
            )}
          </div>
        </button>

        {isPinnedOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            aria-label="Contraer menú"
            title="Contraer menú"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-5">
            {expanded && (
              <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path, location.pathname);

                if (item.disabled) {
                  return (
                    <div
                      key={item.id}
                      title={item.description}
                      className={`rounded-xl bg-amber-50 px-3 py-2.5 text-sm ${expanded ? "" : "flex justify-center"}`}
                    >
                      <span className={`inline-flex items-center ${expanded ? "gap-3" : ""}`}>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-amber-100">
                          <NavIcon id={item.icon} className="h-4 w-4 text-amber-600" />
                        </span>
                        {expanded && <span className="font-medium text-amber-800">{item.label}</span>}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.path)}
                    title={expanded ? item.description : `${item.label}${item.description ? `: ${item.description}` : ""}`}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-100 focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                      active
                        ? "bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-100/80"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${expanded ? "" : "justify-center"}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl transition-colors ${
                      active ? "bg-teal-700 text-white shadow-sm" : "bg-slate-100 text-slate-500"
                    }`}>
                      <NavIcon id={item.icon} className="h-4 w-4" />
                    </span>
                    {expanded && <span className="min-w-0 truncate text-left">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── User profile ─────────────────────────────────────── */}
      <div className="shrink-0 space-y-1 border-t border-slate-100 p-3">
        <div className={`rounded-xl bg-slate-50 p-3 ${expanded ? "" : "flex flex-col items-center gap-0"}`}>
          {expanded ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-[11px] font-bold text-white select-none">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight text-slate-900">
                    {auth.profile?.nombre}
                  </div>
                  <div className="truncate text-xs leading-tight text-slate-500 mt-0.5">
                    {auth.eleam?.nombre || auth.user?.email}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                  {roleLabel}
                </span>
                {auth.pagoActivo && !isDemo && !auth.isSuperadmin && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Activo
                  </span>
                )}
                {isDemo && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    Demo
                  </span>
                )}
                {!auth.pagoActivo && !auth.isSuperadmin && !isDemo && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200">
                    Inactivo
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-[11px] font-bold text-white select-none">
              {initials}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          {expanded && <span className="font-medium">Cerrar sesión</span>}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
