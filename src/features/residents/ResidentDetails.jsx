import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/Loading";
import TabBar from "../../components/TabBar";
import { useAuth } from "../../context/AuthContext";
import { friendlyError } from "../../utils/errorMessages";
import { isValidUUID } from "../../utils/validators";
import CarePlanTab from "../carePlans/CarePlanTab";
import ClinicalAssessmentBadge from "../clinicalAssessments/ClinicalAssessmentBadge";
import { ASSESSMENT_TYPES, barthelDependencyFromScore, evaluationStatus } from "../clinicalAssessments/clinicalAssessmentRules";
import { listAssessments } from "../clinicalAssessments/clinicalAssessmentService";
import ResidentDs20Tab from "../ds20/ResidentDs20Tab";
import ResidentHealthControlModal from "../ds20/ResidentHealthControlModal";
import EmarResidentTab from "../emar/EmarResidentTab";
import NewResidentRecordModal from "./NewResidentRecordModal";
import { ResidentObservationModal } from "./ResidentEvolutionTab";
import ResidentTraceabilityTab from "./ResidentTraceabilityTab";
import { getResidentById } from "./residentService";
import { isDs20CoreAssessment, residentPersonalDs20Pending } from "./residentDs20Status";
import {
  ESTADO_CONFIG,
  calcAge,
  getAllergySummary,
  initials,
  normalizeResidentTab,
} from "./residentUtils";

const TABS = [
  { id: "general", label: "Información general" },
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
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showHealthControlModal, setShowHealthControlModal] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requested = searchParams.get("tab") ?? "general";
  const requestedSection = searchParams.get("section");
  const tab = normalizeResidentTab(requested, TABS.map((item) => item.id));
  const setTab = useCallback((next) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.delete("section");
      if (next === "general") params.delete("tab");
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
  const refreshResidentSnapshot = useCallback(async () => {
    if (!isValidUUID(id)) return;
    try {
      setResident(await getResidentById(id));
    } catch (refreshError) {
      console.error("No se pudo actualizar el resumen del residente.", refreshError);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || tab !== "general" || (requested !== "ds20" && requestedSection !== "ingreso")) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("resident-admission")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, requested, requestedSection, tab]);

  useEffect(() => {
    if (loading || !resident || searchParams.get("nuevaEvolucion") !== "1") return;
    const residentClosed = ["egresado", "fallecido"].includes(resident.estado);
    if (can("crear_observaciones") && !residentClosed) setShowEvolutionModal(true);
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.delete("nuevaEvolucion");
      return params;
    }, { replace: true });
  }, [can, loading, resident, searchParams, setSearchParams]);

  if (loading) return <Loading message="Cargando ficha..." />;
  if (error) return <div className="mx-auto max-w-3xl p-8 text-center text-rose-700">{error}</div>;
  if (!resident) return null;

  const closed = ["egresado", "fallecido"].includes(resident.estado);
  const canEdit = can("editar_residentes");
  const canAddVitals = can("crear_signos_vitales") && !closed;
  const canAddObservation = can("crear_observaciones") && !closed;
  const canAddHealthControl = canEdit && !closed;
  const status = ESTADO_CONFIG[resident.estado];
  const allergies = getAllergySummary(resident.alergias);
  const barthelDependency = barthelDependencyFromScore(resident.indice_barthel);
  const personalDs20Pending = residentPersonalDs20Pending(resident);
  const residentTaskQuery = encodeURIComponent(`${resident.nombre} ${resident.apellido}`);
  const canCreateAnyRecord = canAddVitals || canAddObservation || canAddHealthControl;
  const selectNewRecord = (recordType) => {
    setShowNewRecordModal(false);
    if (recordType === "vitals") navigate(`/vital-signs/new?residenteId=${resident.id}`);
    if (recordType === "evolution") setShowEvolutionModal(true);
    if (recordType === "health-control") setShowHealthControlModal(true);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-7">
      <button type="button" onClick={() => navigate("/residents")} className="mb-4 text-sm font-semibold text-teal-700 hover:underline">
        ← Residentes
      </button>

      <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
              <button
                type="button"
                aria-expanded={showPersonalDetails}
                aria-controls="resident-personal-details"
                onClick={() => setShowPersonalDetails((value) => !value)}
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                {showPersonalDetails ? "Ocultar antecedentes" : "Ver antecedentes personales"}
                {personalDs20Pending.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    {personalDs20Pending.length} {personalDs20Pending.length === 1 ? "pendiente" : "pendientes"}
                  </span>
                )}
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 transition-transform ${showPersonalDetails ? "rotate-180" : ""}`}>
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showPersonalDetails && (
          <div id="resident-personal-details" className="mt-4 border-t border-slate-100 pt-4">
            <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <PersonalDetail label="Nacimiento" value={formatDate(resident.fecha_nacimiento)} />
              <PersonalDetail label="Ingreso" value={formatDate(resident.fecha_ingreso)} />
              <PersonalDetail label="Previsión" value={resident.prevision || "Sin registrar"} ds20Pending={personalDs20Pending.includes("prevision")} />
              <PersonalDetail label="Nacionalidad" value={resident.nacionalidad || "Sin registrar"} />
              <PersonalDetail label="Estado civil" value={resident.estado_civil || "Sin registrar"} capitalize />
              <PersonalDetail label="Domicilio previo" value={resident.direccion_anterior || "Sin registrar"} />
              <PersonalDetail
                label="Dependencia"
                value={barthelDependency || resident.nivel_dependencia || "Sin clasificar"}
                hint={barthelDependency ? `Resultado del último Barthel · ${resident.indice_barthel}/100 puntos` : null}
                capitalize={!barthelDependency}
                ds20Pending={personalDs20Pending.includes("dependencia")}
              />
              <PersonalDetail label="Diagnóstico principal" value={resident.diagnostico_principal || "Sin registrar"} ds20Pending={personalDs20Pending.includes("diagnostico_principal")} />
              <PersonalDetail label="Alergias" value={allergies.label} tone={allergies.hasRealAllergies ? "text-rose-700" : "text-slate-700"} ds20Pending={personalDs20Pending.includes("alergias")} />
            </dl>
            {canEdit && (
              <button type="button" onClick={() => navigate(`/residents/${id}/edit`)} className="mt-4 min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
                Editar datos del residente
              </button>
            )}
          </div>
        )}

        <section aria-labelledby="resident-quick-actions" className="mt-4 border-t border-slate-100 pt-4">
          <h2 id="resident-quick-actions" className="text-sm font-semibold text-slate-900">Acciones</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Action disabled={!canCreateAnyRecord} label="Nuevo registro" onClick={() => setShowNewRecordModal(true)} primary />
            <Action label="Ver tareas pendientes" onClick={() => navigate(`/operacion/cuidados?view=pendientes&q=${residentTaskQuery}`)} />
          </div>
        </section>
        {resident.condicion_salud_grave && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <strong>Condición de salud grave:</strong> {resident.condicion_salud_grave_detalle || "Requiere revisión profesional."}
          </div>
        )}
      </header>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <section role="tabpanel" className="min-w-0">
        {tab === "general" && (
          <div className="space-y-5">
            <ResidentSummary
              resident={resident}
              onResidentChanged={refreshResidentSnapshot}
            />
            <ResidentDs20Tab resident={resident} onResidentChanged={load} />
          </div>
        )}
        {tab === "care" && <CarePlanTab resident={resident} />}
        {tab === "emar" && <EmarResidentTab resident={resident} />}
        {tab === "trazabilidad" && <ResidentTraceabilityTab residenteId={id} refreshKey={historyRefreshKey} />}
      </section>
      <ResidentObservationModal
        resident={resident}
        open={showEvolutionModal}
        onClose={() => setShowEvolutionModal(false)}
        onSaved={async () => {
          setShowEvolutionModal(false);
          setHistoryRefreshKey((value) => value + 1);
        }}
      />
      <NewResidentRecordModal
        open={showNewRecordModal}
        onClose={() => setShowNewRecordModal(false)}
        permissions={{
          vitals: canAddVitals,
          evolution: canAddObservation,
          "health-control": canAddHealthControl,
        }}
        onSelect={selectNewRecord}
      />
      <ResidentHealthControlModal
        resident={resident}
        open={showHealthControlModal}
        onClose={() => setShowHealthControlModal(false)}
        onSaved={async () => {
          setShowHealthControlModal(false);
          setHistoryRefreshKey((value) => value + 1);
        }}
      />
    </main>
  );
}

function PersonalDetail({ label, value, hint = null, capitalize = false, tone = "text-slate-700", ds20Pending = false }) {
  return (
    <div className={`min-w-0 rounded-xl px-2.5 py-2 ${ds20Pending ? "border border-amber-200 bg-amber-50" : ""}`}>
      <dt className={`flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${ds20Pending ? "text-amber-800" : "text-slate-400"}`}>
        {label}
        {ds20Pending && <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] normal-case tracking-normal">Pendiente DS20</span>}
      </dt>
      <dd className={`mt-0.5 break-words text-sm font-medium ${ds20Pending ? "text-amber-950" : tone} ${capitalize ? "capitalize" : ""}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-slate-500">{hint}</dd>}
    </div>
  );
}

function ResidentSummary({ resident, onResidentChanged }) {
  return (
    <div className="space-y-5">
      <ClinicalAssessments resident={resident} onResidentChanged={onResidentChanged} />

      {["egresado", "fallecido"].includes(resident.estado) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Cierre de estadía</h2>
          <p className="mt-2 text-sm text-slate-600">{formatDate(resident.fecha_egreso)} · {resident.motivo_egreso || "Sin motivo registrado"}</p>
        </section>
      )}
    </div>
  );
}

function Action({ label, onClick, disabled = false, primary = false }) {
  const tone = primary
    ? "border-teal-700 bg-teal-700 text-white hover:border-teal-800 hover:bg-teal-800"
    : "border-slate-200 text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800";
  return <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}>{label}</button>;
}

function ClinicalAssessments({ resident, onResidentChanged }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await listAssessments(resident.id, { limit: 30 })); }
    finally { setLoading(false); }
  }, [resident.id]);
  useEffect(() => { load(); }, [load]);
  const handleChanged = async (type) => {
    await load();
    if (type === "barthel") await onResidentChanged?.();
  };
  const byType = useMemo(() => Object.fromEntries(ASSESSMENT_TYPES.map((type) => [type, records.filter((row) => row.tipo === type)])), [records]);
  const overdue = ASSESSMENT_TYPES.some((type) => evaluationStatus(byType[type]?.[0]?.proxima_evaluacion).state === "overdue");
  const requiredMissing = ASSESSMENT_TYPES.filter((type) => isDs20CoreAssessment(type) && !byType[type]?.[0]).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-base font-semibold text-slate-950">Valoración geriátrica</h2><p className="mt-1 text-sm text-slate-500">Funcional, cognitiva, nutricional y social.</p></div>
        <div className="flex flex-wrap gap-2">
          {requiredMissing > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{requiredMissing} {requiredMissing === 1 ? "valoración DS20 pendiente" : "valoraciones DS20 pendientes"}</span>}
          {overdue && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Reevaluación pendiente</span>}
        </div>
      </div>
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" /> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ASSESSMENT_TYPES.map((type) => <ClinicalAssessmentBadge key={type} tipo={type} resident={resident} latest={byType[type]?.[0]} history={byType[type]?.slice(1) ?? []} onChanged={() => handleChanged(type)} ds20Required={isDs20CoreAssessment(type)} />)}
        </div>
      )}
    </section>
  );
}
