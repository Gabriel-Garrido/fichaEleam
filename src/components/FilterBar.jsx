import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { buildActiveChips } from "./filterBarUtils";

const SearchIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-3.5-3.5" strokeLinecap="round" />
  </svg>
);

const XIcon = ({ className = "h-3.5 w-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6 6l12 12M6 18 18 6" strokeLinecap="round" />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────

function FilterControl({ def, value, onChange, mobileBehavior }) {
  const inputBase = "min-h-11 sm:min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-colors";

  if (def.type === "select") {
    return (
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="sr-only sm:not-sr-only">{def.label}</span>
        <div className="relative">
          <select
            value={value ?? ""}
            onChange={(e) => onChange(def.name, e.target.value)}
            className={`${inputBase} appearance-none pr-8 w-full sm:w-auto sm:min-w-[10rem]`}
            aria-label={def.label}
          >
            <option value="">{def.placeholder ?? `Todos${def.label.endsWith("a") ? "s" : ""} los ${def.label.toLowerCase()}`}</option>
            {def.options?.map(([v, l]) => (
              <option key={String(v)} value={v}>{l}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </label>
    );
  }

  if (def.type === "toggle") {
    const checked = value === true;
    return (
      <button
        type="button"
        onClick={() => onChange(def.name, !checked)}
        aria-pressed={checked}
        className={`tap-highlight-none inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
          checked
            ? "border-teal-300 bg-teal-50 text-teal-800"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white"}`}>
          {checked && (
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        {def.label}
      </button>
    );
  }

  if (def.type === "dateRange") {
    const desdeName = def.nameDesde ?? `${def.name}_desde`;
    const hastaName = def.nameHasta ?? `${def.name}_hasta`;
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{def.label}</span>
        <div className="flex flex-wrap gap-2">
          {def.presets && (
            <div className="flex flex-wrap gap-1">
              {def.presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(desdeName, p.desde);
                    onChange(hastaName, p.hasta);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-1 flex-wrap gap-2 sm:flex-nowrap">
            <input
              type="date"
              value={value?.desde ?? ""}
              onChange={(e) => onChange(desdeName, e.target.value)}
              className={`${inputBase} flex-1 sm:w-40`}
              aria-label={`${def.label} desde`}
            />
            <input
              type="date"
              value={value?.hasta ?? ""}
              onChange={(e) => onChange(hastaName, e.target.value)}
              className={`${inputBase} flex-1 sm:w-40`}
              aria-label={`${def.label} hasta`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (def.type === "list") {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (v) => {
      const has = arr.includes(v);
      const next = has ? arr.filter((x) => x !== v) : [...arr, v];
      onChange(def.name, next);
    };
    const wrapperClass = mobileBehavior === "sheet"
      ? "flex flex-wrap gap-2"
      : "flex gap-2 overflow-x-auto scrollbar-none snap-tabs -mx-1 px-1 lg:flex-wrap lg:overflow-x-visible";
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{def.label}</span>
        <div className={wrapperClass}>
          {def.options?.map(([v, l]) => {
            const active = arr.includes(v);
            return (
              <button
                key={String(v)}
                type="button"
                onClick={() => toggle(v)}
                aria-pressed={active}
                className={`tap-highlight-none shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────

/**
 * Componente unificado para filtros de listas. Cubre patrones comunes:
 * - Search con icono, clear-X y debounce (250ms por defecto).
 * - Selects, toggles, date ranges con presets, multi-select listas.
 * - Chips removibles con los filtros activos.
 * - Footer con contador de resultados + botón "Limpiar todo".
 * - Mobile: agrupa filtros bajo un botón "Filtros (N)" que abre un sheet.
 *
 * El componente NO maneja URL sync — eso lo hace `useFilterParams`.
 * Solo se preocupa de la UI y los callbacks.
 */
export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  searchDebounceMs = 250,
  filters = [],
  values = {},
  onFilterChange,
  activeChips,
  onClearAll,
  resultCount,
  totalCount,
  loading = false,
  mobileBehavior = "sheet",
  className = "",
  children,
}) {
  // Local mirror del search para el debounce.
  const [localSearch, setLocalSearch] = useState(search ?? "");
  const lastEmittedRef = useRef(search ?? "");
  const debouncedSearch = useDebouncedValue(localSearch, searchDebounceMs);

  // Si el search externo cambia desde fuera (ej: clearAll), sincronizar.
  useEffect(() => {
    if ((search ?? "") !== localSearch && (search ?? "") !== lastEmittedRef.current) {
      setLocalSearch(search ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Emitir debounced search hacia arriba.
  useEffect(() => {
    if (debouncedSearch !== lastEmittedRef.current) {
      lastEmittedRef.current = debouncedSearch;
      onSearchChange?.(debouncedSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const chips = useMemo(() => {
    if (activeChips !== undefined) return activeChips;
    return buildActiveChips(values, filters, onFilterChange);
  }, [activeChips, values, filters, onFilterChange]);

  const activeCount = chips.length + (localSearch?.trim() ? 1 : 0);

  const [sheetOpen, setSheetOpen] = useState(false);

  const handleClearSearch = () => {
    setLocalSearch("");
    lastEmittedRef.current = "";
    onSearchChange?.("");
  };

  const handleClearAll = () => {
    setLocalSearch("");
    lastEmittedRef.current = "";
    onSearchChange?.("");
    onClearAll?.();
  };

  // Render visible filters: si mobile sheet, solo dentro del sheet.
  const renderFilters = () => filters.filter((f) => !f.hidden).map((def) => (
    <FilterControl
      key={def.name}
      def={def}
      value={
        def.type === "dateRange"
          ? { desde: values[def.nameDesde ?? `${def.name}_desde`], hasta: values[def.nameHasta ?? `${def.name}_hasta`] }
          : values[def.name]
      }
      onChange={onFilterChange}
      mobileBehavior={mobileBehavior}
    />
  ));

  const visibleFiltersCount = filters.filter((f) => !f.hidden).length;
  const hasFilters = visibleFiltersCount > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Row 1: Search + (Filtros button mobile) */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full min-h-11 sm:min-h-10 rounded-xl border border-slate-300 bg-white pl-9 pr-9 py-2 text-base sm:text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            aria-label="Búsqueda"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Limpiar búsqueda"
            >
              <XIcon />
            </button>
          )}
        </div>
        {hasFilters && mobileBehavior === "sheet" && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="lg:hidden inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Abrir filtros"
          >
            <FilterIcon />
            Filtros
            {activeCount > 0 && (
              <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">{activeCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Row 2: Filters inline (desktop, o cuando mobileBehavior=inline) */}
      {hasFilters && (
        <div className={`${mobileBehavior === "sheet" ? "hidden lg:flex" : "flex"} flex-wrap items-end gap-3`}>
          {renderFilters()}
        </div>
      )}

      {/* Mobile sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl animate-slide-up" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filtros</p>
                <h3 className="text-lg font-semibold text-slate-900">Refinar resultados</h3>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar filtros"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4">{renderFilters()}</div>
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => { handleClearAll(); setSheetOpen(false); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Limpiar todo
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Children slot for custom filters that don't fit the schema */}
      {children}

      {/* Row 3: Active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 py-1 pl-3 pr-1 text-xs font-semibold text-teal-800"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-teal-700 hover:bg-teal-100"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Footer: counter */}
      {(resultCount !== undefined || onClearAll) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          {resultCount !== undefined && (
            <span>
              {loading
                ? "Cargando..."
                : totalCount !== undefined && totalCount !== resultCount
                  ? <>Mostrando <strong className="text-slate-800">{resultCount}</strong> de {totalCount}</>
                  : <>{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</>
              }
            </span>
          )}
          {chips.length === 0 && activeCount > 0 && onClearAll && (
            <button
              type="button"
              onClick={handleClearAll}
              className="font-semibold text-slate-500 hover:text-slate-800 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}
    </div>
  );
}
