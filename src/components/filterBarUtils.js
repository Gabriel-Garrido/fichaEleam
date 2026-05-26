/**
 * Helpers puros para FilterBar. Se mantienen separados del componente
 * (en .js, no .jsx) para no romper Fast Refresh del bundler.
 */

/**
 * Deriva chips removibles desde un objeto de filtros y su definición.
 * Retorna [{ key, label, onRemove }] listo para renderizar.
 *
 * - "select"/"text": muestra "Label: <opcion>" si value no es vacío ni default.
 * - "toggle": muestra el label si es true.
 * - "dateRange": muestra "Label: desde YYYY-MM-DD hasta YYYY-MM-DD" si alguno está lleno.
 * - "list": muestra "Label: a, b, c" si tiene items.
 */
export function buildActiveChips(filters, defs, onChange) {
  const chips = [];
  for (const def of defs) {
    if (def.hidden) continue;
    if (def.type === "select" || def.type === "text") {
      const value = filters[def.name];
      if (value !== "" && value !== null && value !== undefined && value !== def.defaultValue) {
        const opt = def.options?.find(([v]) => String(v) === String(value));
        const label = opt ? opt[1] : value;
        chips.push({
          key: def.name,
          label: `${def.label}: ${label}`,
          onRemove: () => onChange(def.name, def.defaultValue ?? ""),
        });
      }
    } else if (def.type === "toggle") {
      if (filters[def.name] === true) {
        chips.push({
          key: def.name,
          label: def.label,
          onRemove: () => onChange(def.name, false),
        });
      }
    } else if (def.type === "list") {
      const value = filters[def.name];
      if (Array.isArray(value) && value.length > 0) {
        const labels = value.map((v) => {
          const opt = def.options?.find(([ov]) => String(ov) === String(v));
          return opt ? opt[1] : v;
        });
        chips.push({
          key: def.name,
          label: `${def.label}: ${labels.join(", ")}`,
          onRemove: () => onChange(def.name, []),
        });
      }
    } else if (def.type === "dateRange") {
      const desde = filters[def.nameDesde ?? `${def.name}_desde`];
      const hasta = filters[def.nameHasta ?? `${def.name}_hasta`];
      if (desde || hasta) {
        const parts = [];
        if (desde) parts.push(`desde ${desde}`);
        if (hasta) parts.push(`hasta ${hasta}`);
        chips.push({
          key: def.name,
          label: `${def.label}: ${parts.join(" ")}`,
          onRemove: () => {
            onChange(def.nameDesde ?? `${def.name}_desde`, "");
            onChange(def.nameHasta ?? `${def.name}_hasta`, "");
          },
        });
      }
    }
  }
  return chips;
}
