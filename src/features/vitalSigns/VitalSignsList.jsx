import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getVitalSigns, deleteVitalSigns } from "./vitalSignsService";
import { getResidents } from "../residents/residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import Button from "../../components/Button";
import FilterBar from "../../components/FilterBar";
import VitalCard from "./VitalCard";
import PageLayout from "../../layout/PageLayout";
import { useFilterParams } from "../../hooks/useFilterParams";
import { turnoLabel } from "../turnos/turnosService";
import {
  VITAL_DEFS,
  STATUS,
  recordOverallStatus,
  recordOverallLabel,
} from "./vitalRanges";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS = [
  { label: "Hoy", desde: today(), hasta: today() },
  { label: "Últ. 7 días", desde: daysAgoIso(6), hasta: today() },
  { label: "Este mes", desde: firstOfMonth(), hasta: today() },
];

export default function VitalSignsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canDelete = can("eliminar_signos_vitales");
  const canCreate = can("crear_signos_vitales");

  const [filters, setFilter, clearFilters] = useFilterParams({
    schema: { residenteId: "string", desde: "date", hasta: "date", estado: "string", view: "string" },
    defaults: { residenteId: "", desde: firstOfMonth(), hasta: today(), estado: "", view: "cards" },
  });
  const filtroResidente = filters.residenteId ?? "";
  const filtroDesde = filters.desde ?? "";
  const filtroHasta = filters.hasta ?? "";
  const filtroEstado = filters.estado ?? "";
  const view = filters.view || "cards";
  const preselectedId = filtroResidente;

  const [records, setRecords] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => toast("No se pudo cargar la lista de residentes.", "warning"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVitalSigns(filtroResidente || null, {
        desde: filtroDesde || null,
        hasta: filtroHasta || null,
      });
      setRecords(data);
    } catch {
      setError("No se pudo cargar los registros de signos vitales.");
    } finally {
      setLoading(false);
    }
  }, [filtroResidente, filtroDesde, filtroHasta]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Eliminar registro",
      message: "¿Eliminar este registro de signos vitales? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteVitalSigns(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast("Registro eliminado.", "success");
    } catch {
      toast("No se pudo eliminar el registro.", "error");
    }
  };

  const filtered = useMemo(() => {
    if (!filtroEstado) return records;
    return records.filter((r) => recordOverallStatus(r) === filtroEstado);
  }, [records, filtroEstado]);

  const stats = useMemo(() => {
    const out = { total: records.length, normal: 0, warning: 0, critical: 0 };
    for (const r of records) {
      const s = recordOverallStatus(r);
      if (s in out) out[s]++;
    }
    return out;
  }, [records]);

  if (loading) return (
    <PageLayout title="Signos vitales" eyebrow="Cuidado diario">
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </PageLayout>
  );

  return (
    <PageLayout
      coachFeatureId="vital-signs"
      title="Signos vitales"
      eyebrow="Cuidado diario"
      description={`${stats.total} registro${stats.total !== 1 ? "s" : ""} en el período seleccionado. Prioriza críticos y residentes en atención.`}
      actions={
        canCreate ? (
          <Button
            onClick={() =>
              navigate(
                preselectedId
                  ? `/vital-signs/new?residenteId=${preselectedId}`
                  : "/vital-signs/new"
              )
            }
            className="w-full sm:w-auto bg-teal-700 text-white px-6 py-2.5 rounded-xl hover:bg-teal-800 font-medium shadow-sm"
          >
            + Nuevo Registro
          </Button>
        ) : null
      }
    >

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button type="button"
 onClick={fetchRecords} className="underline text-sm ml-2">
            Reintentar
          </button>
        </div>
      )}

      {/* Stats / quick filter chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatChip
          active={filtroEstado === ""}
          onClick={() => setFilter("estado", "")}
          label="Todos"
          value={stats.total}
          tone="slate"
        />
        <StatChip
          active={filtroEstado === "normal"}
          onClick={() => setFilter("estado", filtroEstado === "normal" ? "" : "normal")}
          label="Dentro de rango"
          value={stats.normal}
          tone="emerald"
        />
        <StatChip
          active={filtroEstado === "warning"}
          onClick={() => setFilter("estado", filtroEstado === "warning" ? "" : "warning")}
          label="Atención"
          value={stats.warning}
          tone="amber"
        />
        <StatChip
          active={filtroEstado === "critical"}
          onClick={() => setFilter("estado", filtroEstado === "critical" ? "" : "critical")}
          label="Crítico"
          value={stats.critical}
          tone="rose"
        />
      </div>

      {/* Filter bar + toggle vista */}
      <div className="mb-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <FilterBar
          search=""
          onSearchChange={() => {}}
          searchPlaceholder=""
          filters={[
            {
              type: "select",
              name: "residenteId",
              label: "Residente",
              options: residents.map((r) => [r.id, `${r.apellido}, ${r.nombre}`]),
              placeholder: "Todos los residentes",
            },
            {
              type: "dateRange",
              name: "fecha",
              nameDesde: "desde",
              nameHasta: "hasta",
              label: "Período",
              presets: DATE_PRESETS,
            },
          ]}
          values={filters}
          onFilterChange={setFilter}
          onClearAll={clearFilters}
          resultCount={filtered.length}
          totalCount={records.length}
          loading={loading}
        >
          <div className="hidden lg:flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vista:</span>
            <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setFilter("view", "cards")}
                aria-pressed={view === "cards"}
                className={`px-3 py-2 text-xs font-medium min-h-11 sm:min-h-10 ${
                  view === "cards" ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setFilter("view", "table")}
                aria-pressed={view === "table"}
                className={`px-3 py-2 text-xs font-medium border-l border-slate-200 min-h-11 sm:min-h-10 ${
                  view === "table" ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tabla
              </button>
            </div>
          </div>
        </FilterBar>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <p className="text-sm font-semibold text-slate-700">
            {filtroEstado
              ? `Sin registros con estado "${filtroEstado === "normal" ? "dentro de rango" : filtroEstado === "warning" ? "atención" : "crítico"}" en el período.`
              : records.length === 0
                ? "No hay registros de signos vitales en este período."
                : "Ningún registro coincide con los filtros aplicados."}
          </p>
          {(filtroEstado || filtroResidente) && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : view === "cards" ? (
        <div className="space-y-4">
          {filtered.map((r) => (
            <VitalRecordCard
              key={r.id}
              record={r}
              onDelete={canDelete ? () => handleDelete(r.id) : null}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4 lg:hidden">
            {filtered.map((r) => (
              <VitalRecordCard
                key={r.id}
                record={r}
                onDelete={canDelete ? () => handleDelete(r.id) : null}
              />
            ))}
          </div>
          <div className="hidden lg:block">
            <VitalRecordsTable records={filtered} onDelete={canDelete ? handleDelete : null} />
          </div>
        </>
      )}
    </PageLayout>
  );
}

/* ─── StatChip ───────────────────────────────────────────────── */

const TONE = {
  slate:   { bg: "bg-white",      text: "text-slate-700",    ring: "ring-slate-200",   accent: "text-slate-500"  },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700",  ring: "ring-emerald-200", accent: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-800",    ring: "ring-amber-200",   accent: "text-amber-600"  },
  rose:    { bg: "bg-rose-50",    text: "text-rose-700",     ring: "ring-rose-200",    accent: "text-rose-600"   },
};

function StatChip({ active, onClick, label, value, tone }) {
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

/* ─── VitalRecordCard ───────────────────────────────────────── */

function VitalRecordCard({ record, onDelete }) {
  const overall = recordOverallLabel(record);
  const s = STATUS[overall.status];
  const fecha = new Date(record.fecha_hora).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <header className="flex flex-col sm:flex-row justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800 truncate">
              {record.residentes
                ? `${record.residentes.apellido}, ${record.residentes.nombre}`
                : "Residente"}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {overall.label}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{fecha}</span>
            {record.turno && (
              <span className="capitalize">
                {turnoLabel(record.turno)}
              </span>
            )}
            {record.estado_conciencia && (
              <span className="capitalize">Conciencia: {record.estado_conciencia}</span>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="self-start text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
          >
            Eliminar
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        <VitalCard
          icon={VITAL_DEFS.presion.icon}
          label={VITAL_DEFS.presion.label}
          value={VITAL_DEFS.presion.format(record.presion_sistolica, record.presion_diastolica)}
          unit={VITAL_DEFS.presion.unit}
          status={VITAL_DEFS.presion.statusFor(record)}
          normal={VITAL_DEFS.presion.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.fc.icon}
          label={VITAL_DEFS.fc.label}
          value={VITAL_DEFS.fc.format(record.frecuencia_cardiaca)}
          unit={VITAL_DEFS.fc.unit}
          status={VITAL_DEFS.fc.statusFor(record)}
          normal={VITAL_DEFS.fc.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.fr.icon}
          label={VITAL_DEFS.fr.label}
          value={VITAL_DEFS.fr.format(record.frecuencia_respiratoria)}
          unit={VITAL_DEFS.fr.unit}
          status={VITAL_DEFS.fr.statusFor(record)}
          normal={VITAL_DEFS.fr.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.temp.icon}
          label={VITAL_DEFS.temp.label}
          value={VITAL_DEFS.temp.format(record.temperatura)}
          status={VITAL_DEFS.temp.statusFor(record)}
          normal={VITAL_DEFS.temp.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.spo2.icon}
          label={VITAL_DEFS.spo2.label}
          value={VITAL_DEFS.spo2.format(record.saturacion_oxigeno)}
          status={VITAL_DEFS.spo2.statusFor(record)}
          normal={VITAL_DEFS.spo2.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.glucosa.icon}
          label={VITAL_DEFS.glucosa.label}
          value={VITAL_DEFS.glucosa.format(record.glucosa)}
          unit={VITAL_DEFS.glucosa.unit}
          status={VITAL_DEFS.glucosa.statusFor(record)}
          normal={VITAL_DEFS.glucosa.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.dolor.icon}
          label={VITAL_DEFS.dolor.label}
          value={VITAL_DEFS.dolor.format(record.dolor_escala)}
          status={VITAL_DEFS.dolor.statusFor(record)}
          normal={VITAL_DEFS.dolor.normal}
        />
        {record.peso != null && (
          <VitalCard
            icon=""
            label="Peso"
            value={`${record.peso}`}
            unit="kg"
            status="normal"
          />
        )}
      </div>

      {record.observaciones && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-600">
          <span className="text-xs uppercase tracking-wide text-slate-400 mr-2">Notas</span>
          {record.observaciones}
        </div>
      )}
    </article>
  );
}

/* ─── Tabla compacta (vista alternativa) ─────────────────────── */

function VitalRecordsTable({ records, onDelete }) {
  const cellTone = (status) => {
    const s = STATUS[status];
    if (status === "critical") return `font-semibold ${s.text}`;
    if (status === "warning") return `font-medium ${s.text}`;
    if (status === "unknown") return "text-slate-300";
    return "text-slate-700";
  };

  return (
    <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-100 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Residente</th>
            <th className="px-4 py-3 text-left">Fecha/Hora</th>
            <th className="px-4 py-3 text-center">P/A</th>
            <th className="px-4 py-3 text-center">FC</th>
            <th className="px-4 py-3 text-center">FR</th>
            <th className="px-4 py-3 text-center">Temp.</th>
            <th className="px-4 py-3 text-center">SatO₂</th>
            <th className="px-4 py-3 text-center">Glucosa</th>
            <th className="px-4 py-3 text-center">Dolor</th>
            <th className="px-4 py-3 text-center">Turno</th>
            {onDelete && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">
                {r.residentes ? `${r.residentes.apellido}, ${r.residentes.nombre}` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(r.fecha_hora).toLocaleString("es-CL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.presion.statusFor(r))}`}>
                {VITAL_DEFS.presion.format(r.presion_sistolica, r.presion_diastolica)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.fc.statusFor(r))}`}>
                {VITAL_DEFS.fc.format(r.frecuencia_cardiaca)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.fr.statusFor(r))}`}>
                {VITAL_DEFS.fr.format(r.frecuencia_respiratoria)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.temp.statusFor(r))}`}>
                {VITAL_DEFS.temp.format(r.temperatura)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.spo2.statusFor(r))}`}>
                {VITAL_DEFS.spo2.format(r.saturacion_oxigeno)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.glucosa.statusFor(r))}`}>
                {VITAL_DEFS.glucosa.format(r.glucosa)}
              </td>
              <td className={`px-4 py-3 text-center tabular-nums ${cellTone(VITAL_DEFS.dolor.statusFor(r))}`}>
                {VITAL_DEFS.dolor.format(r.dolor_escala)}
              </td>
              <td className="px-4 py-3 text-center capitalize text-slate-500">
                {r.turno ?? "—"}
              </td>
              {onDelete && (
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="text-rose-400 hover:text-rose-600 text-xs"
                  >
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
