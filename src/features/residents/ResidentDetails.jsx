import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/Loading";
import TabBar from "../../components/TabBar";
import { useAuth } from "../../context/AuthContext";
import { friendlyError } from "../../utils/errorMessages";
import { isValidUUID } from "../../utils/validators";
import CarePlanTab from "../carePlans/CarePlanTab";
import ClinicalAssessmentBadge from "../clinicalAssessments/ClinicalAssessmentBadge";
import { ASSESSMENT_TYPES, evaluationStatus } from "../clinicalAssessments/clinicalAssessmentRules";
import { listAssessments } from "../clinicalAssessments/clinicalAssessmentService";
import ResidentDs20Tab from "../ds20/ResidentDs20Tab";
import EmarResidentTab from "../emar/EmarResidentTab";
import ResidentTraceabilityTab from "./ResidentTraceabilityTab";
import { getResidentById } from "./residentService";
import {
  DEPENDENCIA_TONE,
  ESTADO_CONFIG,
  calcAge,
  getAllergySummary,
  initials,
  normalizeResidentTab,
} from "./residentUtils";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "ds20", label: "Ingreso SEREMI" },
  { id: "turno", label: "Turno" },
  { id: "care", label: "Plan" },
  { id: "emar", label: "Medicamentos" },
  { id: "trazabilidad", label: "Historial" },
];

function formatDate(value) {
  if (!value) return "Sin registrar";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL");
}

export default function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAuth();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requested = searchParams.get("tab") ?? "resumen";
  const tab = normalizeResidentTab(requested, TABS.map((item) => item.id));
  const setTab = useCallback((next) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next === "resumen") params.delete("tab");
      else params.set("tab", next);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const load = useCallback(async () => {
    if (!isValidUUID(id)) {
      setError("La ficha solicitada no es válida.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResident(await getResidentById(id));
    } catch (loadError) {
      setError(friendlyError(loadError, "No se pudo cargar la ficha del residente."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading message="Cargando ficha..." />;
  if (error) return <div className="mx-auto max-w-3xl p-8 text-center text-rose-700">{error}</div>;
  if (!resident) return null;

  const closed = ["egresado", "fallecido"].includes(resident.estado);
  const canEdit = can("editar_residentes");
  const canAddVitals = can("crear_signos_vitales") && !closed;
  const canAddObservation = can("crear_observaciones") && !closed;
  const status = ESTADO_CONFIG[resident.estado];
  const allergies = getAllergySummary(resident.alergias);

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-7">
      <button type="button" onClick={() => navigate("/residents")} className="mb-4 text-sm font-semibold text-teal-700 hover:underline">
        ← Residentes
      </button>

      <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-50 text-lg font-bold text-teal-700">
              {initials(resident.nombre, resident.apellido)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">{resident.nombre} {resident.apellido}</h1>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status?.badge ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {status?.label ?? resident.estado}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {[calcAge(resident.fecha_nacimiento) != null ? `${calcAge(resident.fecha_nacimiento)} años` : null, resident.rut || null, resident.ubicacion_label || "Sin cama asignada"].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {canEdit && (
            <button type="button" onClick={() => navigate(`/residents/${id}/edit`)} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
              Editar datos
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Essential label="Dependencia" value={resident.nivel_dependencia || "Sin clasificar"} tone={DEPENDENCIA_TONE[resident.nivel_dependencia]} capitalize />
          <Essential label="Diagnóstico principal" value={resident.diagnostico_principal || "Sin registrar"} />
          <Essential label="Alergias" value={allergies.label} tone={allergies.hasRealAllergies ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-100 bg-slate-50 text-slate-700"} />
        </div>
      </header>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <section role="tabpanel" className="min-w-0">
        {tab === "resumen" && (
          <ResidentSummary
            resident={resident}
            canAddVitals={canAddVitals}
            canAddObservation={canAddObservation}
            onNavigate={navigate}
            onTab={setTab}
          />
        )}
        {tab === "ds20" && <ResidentDs20Tab resident={resident} onResidentChanged={load} />}
        {tab === "turno" && <TurnSection resident={resident} onNavigate={navigate} />}
        {tab === "care" && <CarePlanTab resident={resident} />}
        {tab === "emar" && <EmarResidentTab resident={resident} />}
        {tab === "trazabilidad" && <ResidentTraceabilityTab residenteId={id} />}
      </section>
    </main>
  );
}

function Essential({ label, value, tone = "border-slate-100 bg-slate-50 text-slate-700", capitalize = false }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className={`mt-1 line-clamp-2 text-sm font-semibold ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function ResidentSummary({ resident, canAddVitals, canAddObservation, onNavigate, onTab }) {
  const personal = [
    ["Nacimiento", formatDate(resident.fecha_nacimiento)],
    ["Ingreso", formatDate(resident.fecha_ingreso)],
    ["Previsión", resident.prevision || "Sin registrar"],
    ["Nacionalidad", resident.nacionalidad || "Sin registrar"],
    ["Estado civil", resident.estado_civil || "Sin registrar"],
    ["Domicilio previo", resident.direccion_anterior || "Sin registrar"],
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-950">Acciones frecuentes</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Action disabled={!canAddVitals} label="Registrar signos" onClick={() => onNavigate(`/vital-signs/new?residenteId=${resident.id}`)} />
          <Action disabled={!canAddObservation} label="Nueva observación" onClick={() => onNavigate(`/observations/new?residenteId=${resident.id}`)} />
          <Action label="Ver turno" onClick={() => onTab("turno")} />
          <Action label="Ingreso SEREMI" onClick={() => onTab("ds20")} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-950">Datos esenciales</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {personal.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
        {resident.condicion_salud_grave && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <strong>Condición de salud grave:</strong> {resident.condicion_salud_grave_detalle || "Requiere revisión profesional."}
          </div>
        )}
      </section>

      <ClinicalAssessments resident={resident} />

      {["egresado", "fallecido"].includes(resident.estado) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Cierre de estadía</h2>
          <p className="mt-2 text-sm text-slate-600">{formatDate(resident.fecha_egreso)} · {resident.motivo_egreso || "Sin motivo registrado"}</p>
        </section>
      )}
    </div>
  );
}

function Action({ label, onClick, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40">{label}</button>;
}

function TurnSection({ resident, onNavigate }) {
  const query = encodeURIComponent(`${resident.nombre} ${resident.apellido}`);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-950">Trabajo del turno</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Cuidados, medicamentos y seguimientos se ejecutan en una sola bandeja para evitar registros duplicados dentro de la ficha.</p>
      <button type="button" onClick={() => onNavigate(`/operacion/cuidados?q=${query}`)} className="mt-5 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Abrir tareas de esta persona</button>
    </section>
  );
}

function ClinicalAssessments({ resident }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await listAssessments(resident.id, { limit: 30 })); }
    finally { setLoading(false); }
  }, [resident.id]);
  useEffect(() => { load(); }, [load]);
  const byType = useMemo(() => Object.fromEntries(ASSESSMENT_TYPES.map((type) => [type, records.filter((row) => row.tipo === type)])), [records]);
  const overdue = ASSESSMENT_TYPES.some((type) => evaluationStatus(byType[type]?.[0]?.proxima_evaluacion).state === "overdue");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-base font-semibold text-slate-950">Valoración geriátrica</h2><p className="mt-1 text-sm text-slate-500">Funcional, cognitiva, nutricional y social.</p></div>
        {overdue && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Reevaluación pendiente</span>}
      </div>
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" /> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ASSESSMENT_TYPES.map((type) => <ClinicalAssessmentBadge key={type} tipo={type} resident={resident} latest={byType[type]?.[0]} history={byType[type]?.slice(1) ?? []} onChanged={load} />)}
        </div>
      )}
    </section>
  );
}
