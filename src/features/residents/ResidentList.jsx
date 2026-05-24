import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getResidents, deleteResident, createResidentsBatch } from "./residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import Button from "../../components/Button";
import PageLayout from "../../layout/PageLayout";
import { ESTADO_CONFIG, DEPENDENCIA_TONE, initials, calcAge, getAllergySummary } from "./residentUtils";
import ExcelImportModal from "../import/ExcelImportModal";
import { residentImportConfig, normalizeResidentRows } from "../import/bulkImportConfigs";
import { countPlanResidentSlots, getEffectivePlanLimits } from "../payment/planCatalog";

export default function ResidentList() {
  const navigate = useNavigate();
  const toast    = useToast();
  const confirm  = useConfirm();
  const { can, isAdminEleam, eleam } = useAuth();
  const canDelete = can("eliminar_residentes");
  const canCreate = can("crear_residentes");
  const canImport = canCreate && isAdminEleam;

  const [residents,    setResidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda,     setBusqueda]     = useState("");
  const [view,         setView]         = useState("grid"); // grid | list
  const [importModal,  setImportModal]  = useState(false);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResidents();
      setResidents(data);
    } catch {
      setError("No se pudo cargar la lista de residentes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const handleDelete = async (id, nombre) => {
    const ok = await confirm({
      title: "Eliminar residente",
      message: `¿Eliminar a ${nombre}?\nEsta acción eliminará también todos sus registros clínicos.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteResident(id);
      setResidents((prev) => prev.filter((r) => r.id !== id));
      toast(`${nombre} eliminado correctamente.`, "success");
    } catch {
      toast("No se pudo eliminar el residente.", "error");
    }
  };

  const { maxResidents } = getEffectivePlanLimits(eleam);
  const residentSlotsUsed = useMemo(() => countPlanResidentSlots(residents), [residents]);
  const residentLimitReached = maxResidents !== null && residentSlotsUsed >= maxResidents;

  const handleImportResidents = async (rows, onProgress) => createResidentsBatch(rows, onProgress);

  const handleImportComplete = async (results) => {
    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;
    if (created > 0) {
      toast(`${created} residente${created !== 1 ? "s" : ""} con familiar creado${created !== 1 ? "s" : ""}${failed ? `; ${failed} fila${failed !== 1 ? "s" : ""} con error` : ""}.`, failed ? "warning" : "success");
      await fetchResidents();
    }
  };

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const byStatus = residents.filter((r) => !filtroEstado || r.estado === filtroEstado);
    if (!q) return byStatus;
    return byStatus.filter((r) =>
      r.nombre.toLowerCase().includes(q) ||
      r.apellido.toLowerCase().includes(q) ||
      (r.rut ?? "").toLowerCase().includes(q)
    );
  }, [residents, busqueda, filtroEstado]);

  const stats = useMemo(() => {
    const out = { total: residents.length, activo: 0, hospitalizado: 0, egresado: 0, fallecido: 0 };
    for (const r of residents) if (r.estado in out) out[r.estado]++;
    return out;
  }, [residents]);

  if (loading) return (
    <PageLayout title="Residentes" eyebrow="Operación clínica">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </PageLayout>
  );

  return (
    <PageLayout
      title="Residentes"
      eyebrow="Operación clínica"
      description={stats.total === 0 ? "Registra y gestiona el historial clínico de cada residente del ELEAM." : `${stats.total} residente${stats.total !== 1 ? "s" : ""} registrado${stats.total !== 1 ? "s" : ""}${filtroEstado ? ` · filtrando por ${ESTADO_CONFIG[filtroEstado]?.label.toLowerCase() ?? filtroEstado}` : ""}`}
      actions={
        canCreate ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canImport && (
              <Button
                disabled={residentLimitReached}
                onClick={() => setImportModal(true)}
                className="w-full sm:w-auto bg-white text-teal-700 border border-teal-200 px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-all font-medium shadow-sm disabled:opacity-50"
              >
                Cargar residentes desde Excel
              </Button>
            )}
            <Button
              disabled={residentLimitReached}
              onClick={() => navigate("/residents/new")}
              className="w-full sm:w-auto bg-teal-700 text-white px-6 py-2.5 rounded-xl hover:bg-teal-800 transition-all font-medium shadow-sm disabled:opacity-50"
            >
              + Agregar Residente
            </Button>
          </div>
        ) : null
      }
    >
      <ExcelImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        config={residentImportConfig}
        normalizeRows={normalizeResidentRows}
        normalizeContext={{
          existingResidents: residents,
          maxResidentes: maxResidents,
          currentResidentSlots: residentSlotsUsed,
        }}
        onImport={handleImportResidents}
        onComplete={handleImportComplete}
      />

      {maxResidents !== null && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
          residentLimitReached
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-600"
        }`}>
          Cupo del plan: <span className="font-bold">{residentSlotsUsed}</span> / {maxResidents} residentes activos u hospitalizados.
        </div>
      )}

      {residentLimitReached && canCreate && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El plan permite máximo {maxResidents} residentes activos u hospitalizados. Egresa o actualiza el plan para agregar más residentes.
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex justify-between">
          <span>{error}</span>
          <button type="button"
 onClick={fetchResidents} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

      {residents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Hero */}
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
              <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Aún no hay residentes registrados</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 max-w-sm mx-auto">
              {canCreate
                ? "Elige cómo quieres comenzar: agrega residentes de a uno o carga varios a la vez desde un archivo Excel."
                : "Consulta con el administrador del ELEAM para registrar los primeros residentes."}
            </p>
          </div>

          {canCreate && (
            <>
              <div className="mx-6 border-t border-slate-100" />
              <div className={`p-6 grid gap-4 ${canImport ? "sm:grid-cols-2" : "max-w-sm mx-auto"}`}>
                {/* Opción 1: agregar uno a uno */}
                <button
                  type="button"
                  onClick={() => navigate("/residents/new")}
                  className="group flex flex-col gap-4 rounded-2xl border-2 border-slate-100 p-5 text-left transition-all hover:border-teal-200 hover:bg-teal-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 transition-colors group-hover:bg-teal-100">
                      <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-800">Agregar uno a uno</span>
                  </div>
                  <p className="text-sm leading-5 text-slate-500">
                    Completa el formulario con los datos del residente. Ideal para ingresos individuales o casos únicos.
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition-all group-hover:gap-2">
                    Abrir formulario
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </button>

                {/* Opción 2: importar desde Excel */}
                {canImport ? (
                  <button
                    type="button"
                    onClick={() => setImportModal(true)}
                    className="group flex flex-col gap-4 rounded-2xl border-2 border-slate-100 p-5 text-left transition-all hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 transition-colors group-hover:bg-teal-100">
                        <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800">Importar desde Excel</span>
                    </div>
                    <p className="text-sm leading-5 text-slate-500">
                      Carga varios residentes a la vez con nuestra plantilla. Ideal si ya tienes una lista existente.
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition-all group-hover:gap-2">
                      Cargar archivo
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-slate-100 p-5 opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-500">Importar desde Excel</span>
                    </div>
                    <p className="text-sm leading-5 text-slate-400">
                      Solo disponible para el administrador del ELEAM.
                    </p>
                  </div>
                )}
              </div>
              <p className="pb-8 text-center text-xs text-slate-400">
                Puedes combinar ambos métodos en cualquier momento.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Stats / chips de filtro rápido por estado */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            <StatChip
              label="Total"
              value={stats.total}
              tone="primary"
              active={filtroEstado === ""}
              onClick={() => setFiltroEstado("")}
            />
            <StatChip
              label="Activos"
              value={stats.activo}
              tone="emerald"
              active={filtroEstado === "activo"}
              onClick={() => setFiltroEstado(filtroEstado === "activo" ? "" : "activo")}
            />
            <StatChip
              label="Hospitalizados"
              value={stats.hospitalizado}
              tone="amber"
              active={filtroEstado === "hospitalizado"}
              onClick={() => setFiltroEstado(filtroEstado === "hospitalizado" ? "" : "hospitalizado")}
            />
            <StatChip
              label="Egresados"
              value={stats.egresado}
              tone="slate"
              active={filtroEstado === "egresado"}
              onClick={() => setFiltroEstado(filtroEstado === "egresado" ? "" : "egresado")}
            />
            <StatChip
              label="Fallecidos"
              value={stats.fallecido}
              tone="rose"
              active={filtroEstado === "fallecido"}
              onClick={() => setFiltroEstado(filtroEstado === "fallecido" ? "" : "fallecido")}
            />
          </div>

          {/* Toolbar: búsqueda + selector vista */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 mb-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Buscar por nombre, apellido o RUT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden self-stretch md:self-auto">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-medium ${
                  view === "grid"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-medium border-l border-slate-200 ${
                  view === "list"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Lista
              </button>
            </div>
          </div>

          {/* Lista */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
              <p className="mt-1 text-sm text-slate-500">
                Ningún residente coincide con los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={() => { setBusqueda(""); setFiltroEstado(""); }}
                className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <ResidentCard
                  key={r.id}
                  resident={r}
                  onView={() => navigate(`/residents/${r.id}`)}
                  onEdit={() => navigate(`/residents/${r.id}/edit`)}
                  onDelete={canDelete ? () => handleDelete(r.id, `${r.nombre} ${r.apellido}`) : null}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((r) => (
                <ResidentRow
                  key={r.id}
                  resident={r}
                  onView={() => navigate(`/residents/${r.id}`)}
                  onEdit={() => navigate(`/residents/${r.id}/edit`)}
                  onDelete={canDelete ? () => handleDelete(r.id, `${r.nombre} ${r.apellido}`) : null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

/* ─── StatChip ───────────────────────────────────────────────── */

const TONE = {
  primary: { bg: "bg-white",        text: "text-teal-700",               accent: "text-slate-500",    ring: "ring-teal-200"               },
  emerald: { bg: "bg-emerald-50",   text: "text-emerald-700",            accent: "text-emerald-600",  ring: "ring-emerald-200"            },
  amber:   { bg: "bg-amber-50",     text: "text-amber-800",              accent: "text-amber-600",    ring: "ring-amber-200"              },
  rose:    { bg: "bg-rose-50",      text: "text-rose-700",               accent: "text-rose-600",     ring: "ring-rose-200"               },
  slate:   { bg: "bg-slate-50",     text: "text-slate-700",              accent: "text-slate-500",    ring: "ring-slate-200"              },
};

function StatChip({ label, value, tone, active, onClick }) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border border-slate-100 ${t.bg} px-4 py-3 shadow-sm transition-all hover:shadow-md ${
        active ? `ring-2 ${t.ring}` : ""
      }`}
    >
      <div className={`text-xs font-medium ${t.accent}`}>{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${t.text}`}>{value}</div>
    </button>
  );
}

/* ─── Tarjeta de residente (grid) ───────────────────────────── */

function ResidentCard({ resident: r, onView, onEdit, onDelete }) {
  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.activo;
  const age = calcAge(r.fecha_nacimiento);
  const allergies = getAllergySummary(r.alergias);
  return (
    <article
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:border-teal-200 transition-all flex flex-col cursor-pointer"
      onClick={onView}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Ver ficha de ${r.nombre} ${r.apellido}`}
    >
      <div className="h-2 bg-gradient-to-r from-teal-400 via-teal-600 to-teal-700" />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold shadow-sm">
            {initials(r.nombre, r.apellido)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 truncate">
              {r.nombre} {r.apellido}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${estado.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
                {estado.label}
              </span>
              {age != null && (
                <span className="text-xs text-slate-500">{age} años</span>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-xs">
          {r.rut && (
            <Field label="RUT" value={r.rut} />
          )}
          {r.ubicacion_label && (
            <Field
              label="Ubicación"
              value={r.ubicacion_label}
            />
          )}
          {r.fecha_ingreso && (
            <Field
              label="Ingreso"
              value={new Date(r.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL")}
            />
          )}
          {r.nivel_dependencia && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                Dependencia
              </dt>
              <dd>
                <span
                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full border capitalize ${
                    DEPENDENCIA_TONE[r.nivel_dependencia] ?? "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {r.nivel_dependencia}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {r.diagnostico_principal && (
          <p className="text-xs text-slate-500 mt-3 italic line-clamp-2">
            {r.diagnostico_principal}
          </p>
        )}

        {allergies.hasRealAllergies && (
          <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-rose-50 border border-rose-100 px-2 py-1">
            <svg className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[11px] text-rose-700 line-clamp-1">
              <span className="font-semibold">Alergias:</span> {allergies.label}
            </span>
          </div>
        )}

        {allergies.hasExplicitNoKnownAllergies && (
          <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-2 py-1">
            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span className="text-[11px] font-medium text-emerald-700 line-clamp-1">
              {allergies.label}
            </span>
          </div>
        )}

        <div className="mt-auto pt-4 flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-slate-600 hover:text-teal-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition-colors"
          >
            Editar
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              Eliminar
            </button>
          )}
          <Button
            onClick={onView}
            className="text-xs bg-teal-700 text-white px-3 py-1.5 rounded-xl hover:bg-teal-800 shadow-sm"
          >
            Ver ficha →
          </Button>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700 truncate">{value}</dd>
    </div>
  );
}

/* ─── Fila lista compacta ────────────────────────────────────── */

function ResidentRow({ resident: r, onView, onEdit, onDelete }) {
  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.activo;
  const age = calcAge(r.fecha_nacimiento);
  return (
    <div
      onClick={onView}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Ver ficha de ${r.nombre} ${r.apellido}`}
      className="bg-white rounded-xl shadow-sm border border-slate-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold">
        {initials(r.nombre, r.apellido)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-800 truncate">
            {r.apellido}, {r.nombre}
          </h3>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${estado.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
            {estado.label}
          </span>
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
          {age != null && <span>{age} años</span>}
          {r.rut && <span>RUT: {r.rut}</span>}
          {r.ubicacion_label && (
            <span>{r.ubicacion_label}</span>
          )}
          {r.nivel_dependencia && <span className="capitalize">Dep.: {r.nivel_dependencia}</span>}
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={onView}
          className="text-sm bg-teal-700 text-white px-4 py-1.5 rounded-xl hover:bg-teal-800 transition-all"
        >
          Ver
        </Button>
        <Button
          onClick={onEdit}
          className="text-sm bg-white text-teal-700 border border-teal-700 px-4 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
        >
          Editar
        </Button>
        {onDelete && (
          <Button
            onClick={onDelete}
            className="col-span-2 sm:col-span-1 text-sm bg-white text-rose-500 border border-rose-200 px-4 py-1.5 rounded-xl hover:bg-rose-50 transition-all"
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
