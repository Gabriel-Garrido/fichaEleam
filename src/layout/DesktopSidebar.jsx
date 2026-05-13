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

export default function DesktopSidebar({
  collapsed,
  onToggle,
  sections,
  auth,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const roleLabel = ROLE_LABELS[auth.rol] ?? auth.rol;
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTimer = useRef(null);
  const isPinnedOpen = !collapsed;
  const expanded = isPinnedOpen || previewOpen;

  const clearPreviewTimer = () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
  };

  const schedulePreviewOpen = () => {
    if (isPinnedOpen || previewOpen) return;
    clearPreviewTimer();
    previewTimer.current = window.setTimeout(
      () => setPreviewOpen(true),
      HOVER_PREVIEW_DELAY_MS
    );
  };

  const handleMouseEnter = () => {
    schedulePreviewOpen();
  };

  const handleMouseLeave = () => {
    clearPreviewTimer();
    setPreviewOpen(false);
  };

  const handleFocus = () => {
    schedulePreviewOpen();
  };

  const handleBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearPreviewTimer();
    setPreviewOpen(false);
  };

  useEffect(() => {
    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    };
  }, []);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:flex lg:flex-col ${
        expanded ? "w-72" : "w-20"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        <button          type="button"
          onClick={() => navigate(auth.homePath || "/dashboard")}
          className="min-w-0 text-left"
          title="Inicio"
        >
          <div className={`font-semibold tracking-tight text-slate-950 ${expanded ? "text-xl" : "text-center text-lg"}`}>
            {expanded ? "FichaEleam" : "FE"}
          </div>
          {expanded && <div className="text-xs text-slate-500">Gestión ELEAM</div>}
        </button>
        {isPinnedOpen && (
          <button            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Contraer menú"
            title="Contraer menú"
          >
            ‹
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-5">
            {expanded && (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path, location.pathname);
                const common = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                } ${expanded ? "" : "justify-center"}`;

                if (item.disabled) {
                  return (
                    <div key={item.id} className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800" title={item.description}>
                      <span className="inline-flex items-center gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/70">
                          <NavIcon id={item.icon} className="h-4 w-4" />
                        </span>
                        {expanded && <span>{item.label}</span>}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"

                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={common}
                    title={expanded ? item.description : `${item.label}: ${item.description ?? ""}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${active ? "bg-white text-teal-800" : "bg-slate-100 text-slate-600"}`}>
                      <NavIcon id={item.icon} className="h-4 w-4" />
                    </span>
                    {expanded && (
                      <span className="min-w-0 text-left">
                        <span className="block truncate">{item.label}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className={`mb-3 rounded-xl bg-slate-50 p-3 ${expanded ? "" : "text-center"}`}>
          <div className="truncate text-sm font-semibold text-slate-900">
            {expanded ? auth.profile?.nombre : auth.profile?.nombre?.slice(0, 2)?.toUpperCase()}
          </div>
          {expanded && (
            <>
              <div className="truncate text-xs text-slate-500">{auth.eleam?.nombre || roleLabel}</div>
              <div className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {roleLabel}
              </div>
            </>
          )}
        </div>
        <button          type="button"
          onClick={onLogout}
          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950 ${
            expanded ? "justify-between" : "justify-center"
          }`}
          title="Cerrar sesión"
        >
          {expanded && <span>Cerrar sesión</span>}
          <span>↪</span>
        </button>
      </div>
    </aside>
  );
}
