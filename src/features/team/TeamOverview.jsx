function StatTile({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    teal: "border-teal-100 bg-teal-50 text-teal-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    slate: "border-slate-100 bg-slate-50 text-slate-800",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-75">{sub}</p>}
    </div>
  );
}

export default function TeamOverview({
  funcionarios,
  familiares,
  residentesActivos,
  pendingFuncionarios,
  pendingFamiliares,
  funcionarioSlotsUsed,
  maxFunc,
  limiteAlcanzado,
}) {
  const pendingTotal = pendingFuncionarios + pendingFamiliares;
  const guidance = residentesActivos === 0
    ? "Crea primero un residente activo para poder vincular familiares."
    : limiteAlcanzado
      ? `Plan al límite: ${maxFunc} funcionarios. Edita permisos o actualiza el plan.`
      : "Crea la cuenta, define permisos por cargo y entrega el primer acceso.";

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{guidance}</p>
            <p className="mt-1 text-xs text-slate-500">
              Los módulos visibles se bloquean primero por superadmin y luego se ajustan por usuario.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Permisos por cargo</span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Familiares vinculados</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Primer acceso seguro</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Funcionarios"
          value={funcionarios}
          sub={maxFunc !== null ? `${funcionarioSlotsUsed ?? funcionarios} de ${maxFunc} cupos usados` : "Sin límite configurado"}
          tone={limiteAlcanzado ? "amber" : "teal"}
        />
        <StatTile label="Familiares" value={familiares} sub="Cuentas vinculadas a residentes" tone="emerald" />
        <StatTile label="Residentes activos" value={residentesActivos} sub="Disponibles para vincular" tone={residentesActivos ? "slate" : "amber"} />
        <StatTile label="Accesos pendientes" value={pendingTotal} sub={`${pendingFuncionarios} staff · ${pendingFamiliares} familia`} tone={pendingTotal ? "amber" : "slate"} />
      </div>
    </section>
  );
}
