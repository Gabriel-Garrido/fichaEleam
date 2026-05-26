import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Helper puro: parsea un valor crudo del URL al tipo declarado por el schema.
 * Devuelve `defaults[key]` cuando no hay valor en URL o el parseo falla.
 */
export function parseFilterValue(rawValue, type, defaultValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return defaultValue ?? "";
  }
  if (type === "boolean") {
    if (rawValue === "true" || rawValue === "1") return true;
    if (rawValue === "false" || rawValue === "0") return false;
    return defaultValue ?? false;
  }
  if (type === "number") {
    const n = Number(rawValue);
    return Number.isFinite(n) ? n : (defaultValue ?? null);
  }
  if (type === "date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? rawValue : (defaultValue ?? "");
  }
  if (type === "list") {
    // Comma-separated → array, sin vacíos
    return rawValue.split(",").map((v) => v.trim()).filter(Boolean);
  }
  // string default
  return String(rawValue);
}

/**
 * Helper puro: serializa un valor al string que va al URL. Devuelve null
 * cuando el valor es "vacío" (igual al default o falsy) — para que el
 * URL no se llene de `?estado=&q=`.
 */
export function serializeFilterValue(value, type, defaultValue) {
  if (value === null || value === undefined) return null;
  if (type === "boolean") {
    if (value === defaultValue) return null;
    return value ? "true" : null;
  }
  if (type === "list") {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.join(",");
  }
  if (typeof value === "string" && value.trim() === "") return null;
  if (value === defaultValue) return null;
  return String(value);
}

/**
 * Sincroniza un objeto de filtros con `useSearchParams` (URL).
 *
 * Uso:
 *   const [filters, setFilter, clearAll] = useFilterParams({
 *     schema: { q: "string", estado: "string", desde: "date", soloPendientes: "boolean" },
 *     defaults: { estado: "", soloPendientes: false },
 *   });
 *
 * - Lee filtros del URL al montar usando el schema.
 * - Al cambiar filtros, actualiza URL con `replace: true` (sin llenar el back stack).
 * - Mantiene intactos los params que no están en el schema (otros hooks).
 * - `clearAll()` resetea todos los filtros del schema a sus defaults.
 */
export function useFilterParams({ schema = {}, defaults = {} } = {}) {
  const [params, setParams] = useSearchParams();
  const schemaRef = useRef(schema);
  const defaultsRef = useRef(defaults);
  schemaRef.current = schema;
  defaultsRef.current = defaults;

  // Estado derivado de la URL al montar (y cuando cambian los params externamente)
  const initialFilters = useMemo(() => {
    const out = {};
    for (const key of Object.keys(schemaRef.current)) {
      const type = schemaRef.current[key];
      const raw = params.get(key);
      out[key] = parseFilterValue(raw, type, defaultsRef.current[key]);
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const [filters, setFiltersState] = useState(initialFilters);

  // Si los params externos cambian (ej: navegación), resincronizar estado.
  useEffect(() => {
    setFiltersState(initialFilters);
  }, [initialFilters]);

  // Sync filters → URL (replace, sin push). Solo toca las keys del schema.
  const writeToUrl = useCallback((nextFilters) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of Object.keys(schemaRef.current)) {
        const type = schemaRef.current[key];
        const serialized = serializeFilterValue(nextFilters[key], type, defaultsRef.current[key]);
        if (serialized === null) next.delete(key);
        else next.set(key, serialized);
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  const setFilter = useCallback((nameOrPatch, maybeValue) => {
    setFiltersState((prev) => {
      const patch = typeof nameOrPatch === "string"
        ? { [nameOrPatch]: maybeValue }
        : nameOrPatch;
      const next = { ...prev, ...patch };
      writeToUrl(next);
      return next;
    });
  }, [writeToUrl]);

  const clearAll = useCallback(() => {
    setFiltersState(() => {
      const reset = {};
      for (const key of Object.keys(schemaRef.current)) {
        reset[key] = defaultsRef.current[key] ?? (schemaRef.current[key] === "boolean" ? false : schemaRef.current[key] === "list" ? [] : "");
      }
      writeToUrl(reset);
      return reset;
    });
  }, [writeToUrl]);

  return [filters, setFilter, clearAll];
}
