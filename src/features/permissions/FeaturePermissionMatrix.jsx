import { featuresForRole, groupFeatures } from "./featureCatalog";

export default function FeaturePermissionMatrix({
  role,
  value,
  onChange,
  lockedByRole = {},
  disabled = false,
  title = "Features visibles",
  description = "Controla qué módulos aparecen en el sidebar y qué rutas puede abrir el usuario.",
}) {
  const groups = groupFeatures(featuresForRole(role));

  const toggle = (featureId, enabled) => {
    if (disabled || lockedByRole[featureId] === false) return;
    onChange?.({ ...(value ?? {}), [featureId]: enabled });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {group.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map((feature) => {
                const locked = lockedByRole[feature.id] === false;
                const checked = !locked && value?.[feature.id] !== false;
                return (
                  <label
                    key={feature.id}
                    className={`flex items-start gap-3 rounded-2xl border p-3 ${
                      locked
                        ? "border-slate-200 bg-slate-50 opacity-70"
                        : checked
                          ? "border-teal-200 bg-teal-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || locked}
                      onChange={(event) => toggle(feature.id, event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-200 disabled:opacity-50"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {feature.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {locked ? "Bloqueado por superadmin." : feature.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

