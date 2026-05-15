import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getResidents, deleteResident, createResidentsBatch } from "./residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { ESTADO_CONFIG, DEPENDENCIA_TONE, initials, calcAge, getAllergySummary } from "./residentUtils";
import ExcelImportModal from "../import/ExcelImportModal";
import { residentImportConfig, normalizeResidentRows } from "../import/bulkImportConfigs";

export default function ResidentList() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { can, isAdminEleam } = useAuth();
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
      const data = await getResidents(filtroEstado || null);
      setResidents(data);
    } catch {
      setError("No se pudo cargar la lista de residentes.");
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a ${nombre}?\nEsta acción eliminará también todos sus registros.`)) return;
    try {
      await deleteResident(id);
      setResidents((prev) => prev.filter((r) => r.id !== id));
      toast(`${nombre} eliminado correctamente.`, "success");
    } catch {
      toast("No se pudo eliminar el residente.", "error");
    }
  };

  const handleImportResidents = async (rows, onProgress) => createResidentsBatch(rows, onProgress);

  const handleImportComplete = async (results) => {
    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;
    if (created > 0) {
      toast(`${created} residente${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""}${failed ? `; ${failed} fila${failed !== 1 ? "s" : ""} con error` : ""}.`, failed ? "warning" : "success");
      await fetchResidents();
    }
  };

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) =>
      r.nombre.toLowerCase().includes(q) ||
      r.apellido.toLowerCase().includes(q) ||
      (r.rut ?? "").toLowerCase().includes(q)
    );
  }, [residents, busqueda]);

  const stats = useMemo(() => {
    const out = { total: residents.length, activo: 0, hospitalizado: 0, egresado: 0, fallecido: 0 };
    for (const r of residents) if (r.estado in out) out[r.estado]++;
    return out;
  }, [residents]);

  if (loading) return <Loading message="Cargando residentes..." />;

  return (
    <PageLayout
      title="Residentes"
      eyebrow="Operación clínica"
      description={`${stats.total} residente${stats.total !== 1 ? "s" : ""} registrado${stats.total !== 1 ? "s" : ""}${filtroEstado ? ` · filtrando por ${ESTADO_CONFIG[filtroEstado]?.label.toLowerCase() ?? filtroEstado}` : ""}`}
      actions={
        canCreate ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canImport && (
              <Button
                onClick={() => setImportModal(true)}
                className="w-full sm:w-auto bg-white text-teal-700 border border-teal-200 px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-all font-medium shadow-sm"
              >
                Cargar residentes desde Excel
              </Button>
            )}
            <Button
              onClick={() => navigate("/residents/new")}
              className="w-full sm:w-auto bg-teal-700 text-white px-6 py-2.5 rounded-xl hover:bg-teal-800 transition-all font-medium shadow-sm"
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
        normalizeContext={{ existingResidents: residents }}
        onImport={handleImportResidents}
        onComplete={handleImportComplete}
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex justify-between">
          <span>{error}</span>
          <button type="button"
 onClick={fetchResidents} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

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
        <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-100">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-slate-600">
            {busqueda || filtroEstado
              ? "Sin resultados para esta búsqueda."
              : "No hay residentes registrados."}
          </p>
          {!busqueda && !filtroEstado && (
            <Button
              onClick={() => navigate("/residents/new")}
              className="mt-6 bg-teal-700 text-white px-6 py-2.5 rounded-xl hover:bg-teal-800"
            >
              Agregar primer residente
            </Button>
          )}
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
          {r.habitacion && (
            <Field
              label="Ubicación"
              value={`Hab. ${r.habitacion}${r.cama ? ` · Cama ${r.cama}` : ""}`}
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
          {r.habitacion && (
            <span>Hab. {r.habitacion}{r.cama ? ` · Cama ${r.cama}` : ""}</span>
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
