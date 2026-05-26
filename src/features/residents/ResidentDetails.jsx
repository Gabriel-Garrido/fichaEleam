import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFamiliarForResidente, getResidentById } from "./residentService";
import { getVitalSigns } from "../vitalSigns/vitalSignsService";
import { getObservations } from "../observations/observationsService";
import { useAuth } from "../../context/AuthContext";
import { isValidUUID } from "../../utils/validators";
import { formatDateTime } from "../../utils/dateUtils";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import HelpTooltip from "../../components/HelpTooltip";
import VitalCard from "../vitalSigns/VitalCard";
import CarePlanTab from "../carePlans/CarePlanTab";
import EmarResidentTab from "../emar/EmarResidentTab";
import {
  listCareTasks,
  completeCareTask,
  rescheduleCareTask,
  todayIso,
  currentTurno,
} from "../carePlans/carePlansService";
import CollapsibleGuide from "../../components/CollapsibleGuide";
import MetricCard from "../../components/MetricCard";
import { FeatureCoach } from "../featureCoach";
import {
  CareTaskModal,
  MedicationTaskModal,
  RescheduleCareTaskModal,
  SeguimientoModal,
  WorkItemRow,
} from "../carePlans/CareTasksPage";
import {
  FILTER_LABEL,
  matchesFilter,
  matchesType,
  normalizeCareTask,
  normalizeMedication,
  normalizeSeguimiento,
} from "../carePlans/careTasksBoardUtils";
import {
  administerMedication,
  listMedicationAdministrations,
  validateControlledAdministration,
} from "../emar/emarService";
import {
  continuarSeguimiento,
  getPendingSeguimientos,
  resolverSeguimiento,
} from "../observations/observationsService";
import {
  getVisits,
  validateVisitEntry,
  registerVisitExit,
  cancelVisit,
} from "../familiar/familiarService";
import {
  VITAL_DEFS,
  STATUS,
  recordOverallLabel,
} from "../vitalSigns/vitalRanges";
import ResidentTraceabilityTab from "./ResidentTraceabilityTab";
import ClinicalAssessmentBadge from "../clinicalAssessments/ClinicalAssessmentBadge";
import { listAssessments } from "../clinicalAssessments/clinicalAssessmentService";
import { evaluationStatus, ASSESSMENT_TYPES } from "../clinicalAssessments/clinicalAssessmentRules";

import {
  ESTADO_BADGE,
  DEPENDENCIA_TONE,
  TIPO_LABEL,
  TIPO_BADGE,
  initials,
  calcAge,
  getAllergySummary,
} from "./residentUtils";

function daysSince(date) {
  if (!date) return null;
  // Parse "YYYY-MM-DD" as local midnight to avoid off-by-one for UTC-negative timezones.
  const [y, m, d] = String(date).split("-").map(Number);
  if (!y || !m || !d) return null;
  const local = new Date(y, m - 1, d);
  if (isNaN(local)) return null;
  return Math.floor((Date.now() - local.getTime()) / 86400000);
}

function formatFollowUpLabel(record) {
  const parts = [];

  if (record.seguimiento_fecha) {
    parts.push(
      new Date(`${record.seguimiento_fecha}T12:00:00`).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })
    );
  }

  if (record.seguimiento_turno) parts.push(record.seguimiento_turno);

  return parts.length ? `Seguimiento · ${parts.join(" · ")}` : "Seguimiento pendiente";
}

function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canFeature, can } = useAuth();
  const [resident, setResident] = useState(null);
  const [familiar, setFamiliar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (!isValidUUID(id)) {
      setError("ID de residente inválido.");
      setLoading(false);
      return;
    }
    Promise.all([getResidentById(id), getFamiliarForResidente(id).catch(() => null)])
      .then(([residentData, familiarData]) => {
        setResident(residentData);
        setFamiliar(familiarData);
      })
      .catch((err) => setError("Error al cargar residente: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading message="Cargando residente..." />;
  if (error)   return <div className="p-8 text-rose-600">{error}</div>;
  if (!resident) return <div className="p-8 text-slate-500">Residente no encontrado.</div>;

  const age = calcAge(resident.fecha_nacimiento);
  const stayDays = daysSince(resident.fecha_ingreso);
  const allergies = getAllergySummary(resident.alergias);

  const tabs = [
    { id: "info",          label: "Información" },
    { id: "signos",        label: "Signos Vitales" },
    { id: "observaciones", label: "Observaciones" },
    canFeature("care-plans") && { id: "tareas",  label: "Tareas del turno" },
    { id: "trazabilidad", label: "Trazabilidad" },
    canFeature("care-plans") && { id: "care",    label: "Plan de cuidado" },
    canFeature("emar")       && { id: "emar",    label: "Medicamentos" },
    can("registrar_visitas") && { id: "visitas", label: "Visitas" },
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-3 py-4 sm:px-4 sm:py-8">
      <FeatureCoach featureId="residents-detail" standalone />
      <button
        type="button"
        onClick={() => navigate("/residents")}
        className="text-teal-700 hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        ← Volver a residentes
      </button>

      {/* Header card */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:mb-6">
        <div className="h-16 bg-gradient-to-r from-teal-200 via-teal-500 to-teal-700 sm:h-20" />
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="-mt-8 flex min-w-0 flex-col gap-4 sm:-mt-10 sm:flex-row sm:items-end">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-teal-700 shadow-md ring-4 ring-white sm:h-20 sm:w-20 sm:text-2xl">
              {initials(resident.nombre, resident.apellido)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <h1 className="min-w-0 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  {resident.nombre} {resident.apellido}
                </h1>
                <span
                  className={`w-fit text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                    ESTADO_BADGE[resident.estado] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {resident.estado}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-sm text-slate-500">
                {age != null && <InfoPill>{age} años</InfoPill>}
                {resident.sexo && <InfoPill className="capitalize">{resident.sexo}</InfoPill>}
                {resident.rut && <InfoPill>RUT: {resident.rut}</InfoPill>}
                {resident.ubicacion_label && (
                  <InfoPill>
                    {resident.ubicacion_label}
                  </InfoPill>
                )}
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate(`/residents/${id}/edit`)}
                className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 sm:min-h-0"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => navigate(`/vital-signs/new?residenteId=${id}`)}
                className="min-h-11 rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 sm:min-h-0"
              >
                + Signos
              </button>
              <button
                type="button"
                onClick={() => navigate(`/observations/new?residenteId=${id}`)}
                className="min-h-11 rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 sm:min-h-0"
              >
                + Observación
              </button>
            </div>
          </div>

          {/* Quick info strip */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4">
            <QuickStat
              label="Ingreso"
              value={
                resident.fecha_ingreso
                  ? new Date(resident.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL")
                  : "—"
              }
              sub={stayDays != null ? `${stayDays} días en ELEAM` : undefined}
            />
            <QuickStat
              label="Dependencia"
              value={resident.nivel_dependencia ?? "—"}
              tone={DEPENDENCIA_TONE[resident.nivel_dependencia]}
              capitalize
            />
            <QuickStat
              label="Índice Barthel"
              value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : "—"}
            />
            <QuickStat
              label="Diagnóstico"
              value={resident.diagnostico_principal || "—"}
              truncate
            />
          </div>

          {allergies.hasRealAllergies && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0 text-rose-500 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="text-sm text-rose-700">
                <span className="font-semibold">Alergias:</span>{" "}
                {allergies.label}
              </div>
            </div>
          )}

          {allergies.hasExplicitNoKnownAllergies && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <div className="text-sm font-medium text-emerald-700">
                {allergies.label}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile with snap + fade hint */}
      <div className="relative mb-5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mb-6">
        <div className="snap-tabs scrollbar-none overflow-x-auto px-2 sm:px-0">
          <div className="flex min-w-max items-end border-b border-slate-200">
            {tabs.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`tap-highlight-none snap-start whitespace-nowrap px-4 py-3 sm:py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                aria-current={tab === t.id ? "page" : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 sm:hidden" aria-hidden="true" />
      </div>

      {tab === "info"          && <InfoTab resident={resident} familiar={familiar} />}
      {tab === "signos"        && <SignosTab residenteId={id} navigate={navigate} />}
      {tab === "observaciones" && <ObservacionesTab residenteId={id} navigate={navigate} />}
      {tab === "tareas"        && <ResidentDailyTasksTab residenteId={id} />}
      {tab === "trazabilidad"  && <ResidentTraceabilityTab residenteId={id} />}
      {tab === "care"          && <CarePlanTab resident={resident} />}
      {tab === "emar"          && <EmarResidentTab resident={resident} />}
      {tab === "visitas"       && <VisitasTab residenteId={id} />}
    </div>
  );
}

function ClinicalScalesSection({ resident }) {
  const [byTipo, setByTipo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!resident?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAssessments(resident.id, { limit: 30 });
      const grouped = ASSESSMENT_TYPES.reduce((acc, tipo) => {
        acc[tipo] = data.filter((row) => row.tipo === tipo);
        return acc;
      }, {});
      setByTipo(grouped);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de evaluaciones.");
    } finally {
      setLoading(false);
    }
  }, [resident?.id]);

  useEffect(() => { load(); }, [load]);

  const hasAnyOverdue = useMemo(() => {
    return ASSESSMENT_TYPES.some((tipo) => {
      const latest = byTipo[tipo]?.[0];
      return evaluationStatus(latest?.proxima_evaluacion).state === "overdue";
    });
  }, [byTipo]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800">Escalas funcionales</h3>
          <p className="text-xs text-slate-500">
            Reevaluación cada 6 meses según norma MINSAL, o antes ante hospitalización, caída o cambio clínico.
          </p>
        </div>
        {hasAnyOverdue && (
          <span className="w-fit rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            Tienes reevaluaciones pendientes
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSESSMENT_TYPES.map((tipo) => (
            <ClinicalAssessmentBadge
              key={tipo}
              tipo={tipo}
              resident={resident}
              latest={byTipo[tipo]?.[0]}
              history={byTipo[tipo]?.slice(1) ?? []}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InfoPill({ children, className = "" }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ${className}`}>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function QuickStat({ label, value, sub, tone, capitalize, truncate }) {
  return (
    <div className={`min-w-0 rounded-xl border bg-white px-3 py-2.5 ${tone || "border-slate-100"}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
        {label}
      </div>
      <div
        className={`min-w-0 text-sm font-semibold text-slate-800 ${capitalize ? "capitalize" : ""} ${
          truncate ? "line-clamp-2" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Info Tab ──────────────────────────────────────────────── */

function InfoTab({ resident, familiar }) {
  const allergies = getAllergySummary(resident.alergias);
  const familiarProfile = familiar?.profiles ?? null;
  const InfoRow = ({ label, value }) =>
    value != null && value !== "" ? (
      <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 min-w-0 text-sm font-medium text-slate-700">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <ResidentInfoSection
        title="Datos personales"
        description="Identificación y antecedentes administrativos del residente."
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            label="Fecha nacimiento"
            value={
              resident.fecha_nacimiento
                ? new Date(resident.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-CL")
                : null
            }
          />
          <InfoRow label="Sexo"            value={resident.sexo} />
          <InfoRow label="Nacionalidad"    value={resident.nacionalidad} />
          <InfoRow label="Estado civil"    value={resident.estado_civil} />
          <InfoRow label="Previsión"       value={resident.prevision} />
          <InfoRow label="Grupo sanguíneo" value={resident.grupo_sanguineo} />
        </dl>
      </ResidentInfoSection>

      <ResidentInfoSection
        title="Información clínica"
        description="Datos esenciales para el cuidado diario y la continuidad del turno."
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow label="Diagnóstico principal" value={resident.diagnostico_principal} />
          <InfoRow label="Nivel de dependencia"  value={resident.nivel_dependencia} />
          {(allergies.hasRealAllergies || allergies.hasExplicitNoKnownAllergies) && (
            <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Alergias</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {allergies.hasRealAllergies ? allergies.items.map((a) => (
                  <span key={a} className="max-w-full rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                    {a}
                  </span>
                )) : (
                  <span className="max-w-full rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {allergies.label}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </ResidentInfoSection>

      <ClinicalScalesSection resident={resident} />

      <ResidentInfoSection
        title="Familiar vinculado"
        description="Contacto asociado para comunicaciones y portal familiar."
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow label="Nombre" value={familiarProfile?.nombre} />
          <InfoRow label="Parentesco" value={familiar?.parentesco} />
          <InfoRow label="Correo" value={familiarProfile?.email} />
          <InfoRow label="Teléfono" value={familiarProfile?.telefono} />
          <InfoRow label="Dirección anterior" value={resident.direccion_anterior} />
        </dl>
        {!familiarProfile && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este residente aún no tiene familiar vinculado.
          </p>
        )}
      </ResidentInfoSection>

      {(resident.estado === "egresado" || resident.estado === "fallecido") &&
        resident.fecha_egreso && (
          <ResidentInfoSection title="Egreso">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow
                label="Fecha de egreso"
                value={new Date(resident.fecha_egreso + "T12:00:00").toLocaleDateString("es-CL")}
              />
              <InfoRow label="Motivo de egreso" value={resident.motivo_egreso} />
            </dl>
          </ResidentInfoSection>
        )}
    </div>
  );
}

function ResidentInfoSection({ title, description, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* ─── Signos Vitales Tab (lazy-loaded) ──────────────────────── */

function SignosTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getVitalSigns(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar los signos vitales."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  const latest = records[0];
  const overall = latest ? recordOverallLabel(latest) : null;

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-slate-800">Signos vitales recientes</h3>
        <div className="flex flex-wrap gap-3">
          <button type="button"
 onClick={load} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => navigate(`/vital-signs?residenteId=${residenteId}`)}
            className="text-xs text-teal-700 hover:underline"
          >
            Ver todos →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-3">No hay registros de signos vitales.</p>
          <button
            type="button"
            onClick={() => navigate(`/vital-signs/new?residenteId=${residenteId}`)}
            className="text-sm bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800"
          >
            Registrar ahora
          </button>
        </div>
      ) : (
        <>
          {/* Snapshot del último registro con tarjetas grandes */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-400">Último registro</div>
                <div className="text-sm font-medium text-slate-700">
                  {new Date(latest.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                  {latest.turno && (
                    <span className="ml-2 text-slate-400 capitalize">· Turno {latest.turno}</span>
                  )}
                </div>
              </div>
              {overall && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS[overall.status].badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS[overall.status].dot}`} />
                  {overall.label}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-4">
              <VitalCard
                icon={VITAL_DEFS.presion.icon}
                label={VITAL_DEFS.presion.label}
                value={VITAL_DEFS.presion.format(latest.presion_sistolica, latest.presion_diastolica)}
                unit={VITAL_DEFS.presion.unit}
                status={VITAL_DEFS.presion.statusFor(latest)}
                normal={VITAL_DEFS.presion.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.fc.icon}
                label={VITAL_DEFS.fc.label}
                value={VITAL_DEFS.fc.format(latest.frecuencia_cardiaca)}
                unit={VITAL_DEFS.fc.unit}
                status={VITAL_DEFS.fc.statusFor(latest)}
                normal={VITAL_DEFS.fc.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.fr.icon}
                label={VITAL_DEFS.fr.label}
                value={VITAL_DEFS.fr.format(latest.frecuencia_respiratoria)}
                unit={VITAL_DEFS.fr.unit}
                status={VITAL_DEFS.fr.statusFor(latest)}
                normal={VITAL_DEFS.fr.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.temp.icon}
                label={VITAL_DEFS.temp.label}
                value={VITAL_DEFS.temp.format(latest.temperatura)}
                status={VITAL_DEFS.temp.statusFor(latest)}
                normal={VITAL_DEFS.temp.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.spo2.icon}
                label={VITAL_DEFS.spo2.label}
                value={VITAL_DEFS.spo2.format(latest.saturacion_oxigeno)}
                status={VITAL_DEFS.spo2.statusFor(latest)}
                normal={VITAL_DEFS.spo2.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.glucosa.icon}
                label={VITAL_DEFS.glucosa.label}
                value={VITAL_DEFS.glucosa.format(latest.glucosa)}
                unit={VITAL_DEFS.glucosa.unit}
                status={VITAL_DEFS.glucosa.statusFor(latest)}
                normal={VITAL_DEFS.glucosa.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.dolor.icon}
                label={VITAL_DEFS.dolor.label}
                value={VITAL_DEFS.dolor.format(latest.dolor_escala)}
                status={VITAL_DEFS.dolor.statusFor(latest)}
                normal={VITAL_DEFS.dolor.normal}
              />
            </div>
          </section>

          {/* Histórico breve */}
          {records.length > 1 && (
            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                Registros anteriores
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Fecha/Hora</th>
                      <th className="px-3 py-2.5 text-center">P/A</th>
                      <th className="px-3 py-2.5 text-center">FC</th>
                      <th className="px-3 py-2.5 text-center">Temp</th>
                      <th className="px-3 py-2.5 text-center">SatO₂</th>
                      <th className="px-3 py-2.5 text-center">Dolor</th>
                      <th className="px-3 py-2.5 text-center">Turno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(1).map((r) => (
                      <HistoryRow key={r.id} r={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HistoryRow({ r }) {
  const cellTone = (status) => {
    const s = STATUS[status];
    if (status === "critical") return `font-semibold ${s.text}`;
    if (status === "warning") return `font-medium ${s.text}`;
    if (status === "unknown") return "text-slate-300";
    return "text-slate-700";
  };
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2.5 text-slate-600">
        {new Date(r.fecha_hora).toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.presion.statusFor(r))}`}>
        {VITAL_DEFS.presion.format(r.presion_sistolica, r.presion_diastolica)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.fc.statusFor(r))}`}>
        {VITAL_DEFS.fc.format(r.frecuencia_cardiaca)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.temp.statusFor(r))}`}>
        {VITAL_DEFS.temp.format(r.temperatura)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.spo2.statusFor(r))}`}>
        {VITAL_DEFS.spo2.format(r.saturacion_oxigeno)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.dolor.statusFor(r))}`}>
        {VITAL_DEFS.dolor.format(r.dolor_escala)}
      </td>
      <td className="px-3 py-2.5 text-center capitalize text-slate-400">{r.turno ?? "—"}</td>
    </tr>
  );
}

/* ─── Observaciones Tab (lazy-loaded) ───────────────────────── */

function ObservacionesTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getObservations(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar las observaciones."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-slate-800">Últimas 5 observaciones</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button"
 onClick={load} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => navigate(`/observations?residenteId=${residenteId}`)}
            className="text-xs text-teal-700 hover:underline"
          >
            Ver todas →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-3">No hay observaciones registradas.</p>
          <button
            type="button"
            onClick={() => navigate(`/observations/new?residenteId=${residenteId}`)}
            className="text-sm bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800"
          >
            Nueva observación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-100 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    TIPO_BADGE[r.tipo] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {TIPO_LABEL[r.tipo] ?? r.tipo}
                </span>
                {r.requiere_seguimiento && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    {formatFollowUpLabel(r)}
                  </span>
                )}
                <span className="text-xs text-slate-400 capitalize">{r.turno}</span>
                <span className="basis-full text-xs text-slate-400 sm:ml-auto sm:basis-auto">
                  {new Date(r.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700">{r.descripcion}</p>
              {r.acciones_tomadas && (
                <p className="text-xs text-slate-400 italic mt-1">
                  Acciones: {r.acciones_tomadas}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Visitas Tab (staff: validate entry & exit) ────────────── */

const VF_STATUS = {
  pendiente:  { label: "Esperando validación", pill: "bg-amber-100 text-amber-800",    dot: "bg-amber-400 animate-pulse" },
  activa:     { label: "En visita",            pill: "bg-teal-100 text-teal-800",      dot: "bg-teal-500 animate-pulse" },
  salida_pendiente: { label: "Salida por validar", pill: "bg-sky-100 text-sky-800",    dot: "bg-sky-500 animate-pulse" },
  completada: { label: "Completada",           pill: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  cancelada:  { label: "Cancelada",            pill: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

function VisitasTab({ residenteId }) {
  const toast = useToast();
  const [visitas, setVisitas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busyId, setBusyId]         = useState(null);
  const [exitModal, setExitModal]   = useState(null);
  const [exitNotes, setExitNotes]   = useState("");
  const loaded                      = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getVisits(residenteId, 50);
      setVisitas(data);
      loaded.current = true;
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [residenteId]);

  useEffect(() => {
    if (loaded.current) return;
    load();
  }, [load]);

  const doValidateEntry = async (visitId) => {
    setBusyId(visitId);
    try {
      const updated = await validateVisitEntry(visitId);
      setVisitas((prev) => prev.map((v) => v.id === visitId ? { ...v, ...updated } : v));
      toast("Ingreso validado correctamente.", "success");
    } catch {
      toast("No se pudo validar el ingreso.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doRegisterExit = async () => {
    if (!exitModal) return;
    setBusyId(exitModal.id);
    try {
      const updated = await registerVisitExit({ visitId: exitModal.id, notas: exitNotes });
      setVisitas((prev) => prev.map((v) => v.id === exitModal.id ? { ...v, ...updated } : v));
      toast("Salida validada correctamente.", "success");
      setExitModal(null);
      setExitNotes("");
    } catch {
      toast("No se pudo validar la salida.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async (visitId) => {
    setBusyId(visitId);
    try {
      const updated = await cancelVisit(visitId);
      setVisitas((prev) => prev.map((v) => v.id === visitId ? { ...v, ...updated } : v));
      toast("Visita cancelada.", "success");
    } catch {
      toast("No se pudo cancelar.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  const pending  = visitas.filter((v) => v.estado === "pendiente");
  const active   = visitas.filter((v) => v.estado === "activa");
  const exitPending = visitas.filter((v) => v.estado === "salida_pendiente");
  const history  = visitas.filter((v) => !["pendiente", "activa", "salida_pendiente"].includes(v.estado));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">Registro de visitas</h3>
            <HelpTooltip label="Ayuda: flujo de visitas">
              El familiar anuncia llegada y salida desde su portal. El funcionario solo valida el ingreso y luego valida la salida anunciada.
            </HelpTooltip>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {pending.length > 0 && `${pending.length} esperando validación · `}
            {active.length > 0 && `${active.length} en curso · `}
            {exitPending.length > 0 && `${exitPending.length} salida por validar · `}
            {visitas.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Actualizar
          </button>
        </div>
      </div>

      {/* Pending visits — need entry validation */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Esperando validación de ingreso
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((v) => (
              <div key={v.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {v.profiles?.nombre ?? "Familiar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anunció llegada: {formatDateTime(v.fecha_hora)}
                  </p>
                  {v.notas && <p className="text-xs text-slate-500 italic mt-0.5">{v.notas}</p>}
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => doValidateEntry(v.id)}
                    disabled={busyId === v.id}
                    className="min-h-10 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 sm:min-h-0"
                  >
                    {busyId === v.id ? "..." : "Validar ingreso"}
                  </button>
                  <button
                    type="button"
                    onClick={() => doCancel(v.id)}
                    disabled={busyId === v.id}
                    className="min-h-10 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active visits — waiting for family exit announcement */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              En visita ahora
            </span>
            <HelpTooltip label="Ayuda: visita activa">
              La salida debe iniciarla el familiar con el botón "Anunciar salida" desde su portal. Después aparecerá aquí para validación.
            </HelpTooltip>
          </div>
          <div className="space-y-2">
            {active.map((v) => (
              <div key={v.id} className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {v.profiles?.nombre ?? "Familiar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ingresó: {formatDateTime(v.fecha_hora)}
                    {v.validado_en && ` · Validado: ${formatDateTime(v.validado_en)}`}
                  </p>
                  {v.notas && <p className="text-xs text-slate-500 italic mt-0.5">{v.notas}</p>}
                  <p className="text-xs text-teal-700 mt-2">
                    Esperando que el familiar anuncie su salida.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exit pending visits — staff validates the announced exit */}
      {exitPending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-200 px-2.5 py-1 text-xs font-semibold text-sky-800">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Salida anunciada
            </span>
            <HelpTooltip label="Ayuda: validar salida">
              Valida la salida cuando el familiar ya se retiró. Esa validación guarda la hora oficial de salida y calcula la duración de la visita.
            </HelpTooltip>
          </div>
          <div className="space-y-2">
            {exitPending.map((v) => (
              <div key={v.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {v.profiles?.nombre ?? "Familiar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ingresó: {formatDateTime(v.fecha_hora)}
                    {v.salida_anunciada_en && ` · Salida anunciada: ${formatDateTime(v.salida_anunciada_en)}`}
                  </p>
                  {v.notas && <p className="text-xs text-slate-500 italic mt-0.5">{v.notas}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setExitModal(v)}
                  disabled={!!busyId}
                  className="min-h-10 w-full rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:shrink-0"
                >
                  Validar salida
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visit history */}
      {history.length > 0 && (
        <section className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Historial
          </div>
          <ul className="divide-y divide-slate-100">
            {history.map((v) => {
              const st = VF_STATUS[v.estado] ?? VF_STATUS.completada;
              return (
                <li key={v.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="pt-1.5 shrink-0">
                    <span className={`block h-2.5 w-2.5 rounded-full ${st.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">
                        {v.profiles?.nombre ?? "Familiar"}
                      </p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.pill}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-slate-400">
                      <span>{formatDateTime(v.fecha_hora)}</span>
                      {v.duracion_min && <span>{v.duracion_min} min</span>}
                      {v.validado_en && <span>Ingreso validado: {formatDateTime(v.validado_en)}</span>}
                      {v.salida_anunciada_en && <span>Salida anunciada: {formatDateTime(v.salida_anunciada_en)}</span>}
                      {v.salida_validada_en && <span>Salida validada: {formatDateTime(v.salida_validada_en)}</span>}
                      {v.salida_hora && !v.salida_validada_en && <span>Salida: {formatDateTime(v.salida_hora)}</span>}
                    </div>
                    {v.notas && <p className="text-xs text-slate-400 italic mt-0.5">{v.notas}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {visitas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500">Sin visitas registradas para este residente.</p>
        </div>
      )}

      {/* Exit validation modal */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Validar salida</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{exitModal.profiles?.nombre ?? "Familiar"}</span>
              <span className="text-slate-400"> · salida anunciada {formatDateTime(exitModal.salida_anunciada_en ?? exitModal.fecha_hora)}</span>
            </p>
            <div>
              <label htmlFor="exit-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                Notas (opcional)
              </label>
              <textarea
                id="exit-notes"
                rows={2}
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Observaciones sobre la visita..."
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setExitModal(null); setExitNotes(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doRegisterExit}
                disabled={!!busyId}
                className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {busyId ? "Guardando..." : "Validar salida"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tareas del turno del residente ────────────────────────── */

function ResidentDailyTasksTab({ residenteId }) {
  const toast = useToast();
  const { can, profile } = useAuth();
  const canComplete = can("completar_tareas_cuidado");
  const canAdminister = can("administrar_medicamentos");
  const canValidate = can("validar_medicamentos_controlados");
  const canResolveSeguimiento = can("crear_observaciones");

  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [filter, setFilter] = useState("pendientes");
  const [type, setType] = useState("todos");
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [careModal, setCareModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [medModal, setMedModal] = useState(null);
  const [seguimientoModal, setSeguimientoModal] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [careRows, medRows, seguimientos] = await Promise.all([
        listCareTasks({ residenteId, fecha, turno, estado: null, generate: true, limit: 500 }),
        listMedicationAdministrations({ residenteId, fecha, turno, estado: null, generate: true, limit: 500 }),
        getPendingSeguimientos(fecha, turno, { residenteId }).catch(() => []),
      ]);
      setAllItems([
        ...seguimientos.map(normalizeSeguimiento),
        ...careRows.map(normalizeCareTask),
        ...medRows.map(normalizeMedication),
      ].sort((a, b) => `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`)));
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las tareas del residente.");
    } finally {
      setLoading(false);
    }
  }, [fecha, residenteId, turno]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allItems
      .filter((item) => matchesType(item, type))
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!term) return true;
        return [item.title, item.meta, item.detail, item.statusLabel, item.typeLabel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
  }, [allItems, filter, query, type]);

  const metrics = useMemo(() => {
    return allItems.reduce((acc, item) => {
      acc.total += 1;
      if (item.source === "care") acc.cuidado += 1;
      if (item.source === "med") acc.medicamentos += 1;
      if (item.source === "seguimiento") acc.seguimientos += 1;
      if (item.open) acc.pendientes += 1;
      if (item.estado === "reprogramada") acc.reprogramadas += 1;
      if (item.estado === "pendiente_validacion") acc.porValidar += 1;
      if (item.overdue) acc.vencidas += 1;
      return acc;
    }, { total: 0, pendientes: 0, vencidas: 0, cuidado: 0, medicamentos: 0, seguimientos: 0, porValidar: 0, reprogramadas: 0 });
  }, [allItems]);

  const handleCareClose = async ({ action, notas, motivo, seguimiento, seguimientoFecha, seguimientoTurno }) => {
    if (!careModal) return;
    setSaving(true);
    try {
      await completeCareTask({
        id: careModal.row.id,
        estado: action,
        notas,
        motivoOmision: motivo,
        requiereSeguimiento: seguimiento,
        seguimientoFecha,
        seguimientoTurno,
      });
      toast(action === "cumplida" ? "Tarea marcada como cumplida." : "Omisión registrada.", "success");
      setCareModal(null);
      await load(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo cerrar la tarea.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCareReschedule = async ({ fecha: nextFecha, turno: nextTurno, hora, notas, seguimiento, seguimientoFecha, seguimientoTurno }) => {
    if (!rescheduleModal) return;
    setSaving(true);
    try {
      await rescheduleCareTask({
        id: rescheduleModal.row.id,
        fecha: nextFecha,
        turno: nextTurno,
        hora,
        notas,
        requiereSeguimiento: seguimiento,
        seguimientoFecha,
        seguimientoTurno,
      });
      toast("Tarea reprogramada.", "success");
      setRescheduleModal(null);
      await load(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo reprogramar la tarea.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleMedicationSubmit = async (payload) => {
    setSaving(true);
    try {
      if (payload.action === "validar") {
        await validateControlledAdministration({ id: payload.row.id, notas: payload.notas });
        toast("Registro de medicamento validado.", "success");
      } else {
        await administerMedication({
          id: payload.row.id,
          estado: payload.action,
          loteId: payload.loteId,
          dosis: payload.dosis,
          notas: payload.notas,
          motivoOmision: payload.motivo,
          requiereSeguimiento: payload.seguimiento,
          seguimientoFecha: payload.seguimientoFecha,
          seguimientoTurno: payload.seguimientoTurno,
        });
        toast(payload.action === "administrado" ? "Administración registrada." : "Omisión registrada.", "success");
      }
      setMedModal(null);
      await load(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar el registro de medicamento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSeguimientoSubmit = async ({ id, notas, continuar, nuevaFecha, nuevoTurno }) => {
    setSaving(true);
    try {
      if (continuar) {
        await continuarSeguimiento(id, { notas, nuevaFecha, nuevoTurno });
        toast("Seguimiento registrado. Nuevo pendiente creado para el turno indicado.", "success");
      } else {
        await resolverSeguimiento(id, { notas });
        toast("Seguimiento finalizado correctamente.", "success");
      }
      setSeguimientoModal(null);
      await load(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo resolver el seguimiento.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center">
      <span>{error}</span>
      <button type="button" onClick={() => load()} className="text-left text-xs underline sm:ml-auto">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_145px_145px_150px_145px]">
        <div className="rounded-xl bg-teal-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Tareas del residente
            <HelpTooltip label="Ayuda: tareas del residente">
              Esta vista genera y muestra tareas de cuidado, medicamentos y seguimientos del residente para la fecha y turno seleccionados. Reintentar no duplica registros.
            </HelpTooltip>
          </div>
          <div className="mt-1 text-sm font-semibold text-teal-950">
            {metrics.pendientes} pendiente{metrics.pendientes === 1 ? "" : "s"} · {metrics.vencidas} vencida{metrics.vencidas === 1 ? "" : "s"}
          </div>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Turno
          <select value={turno} onChange={(e) => setTurno(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {["mañana", "tarde", "noche"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Estado
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {Object.entries(FILTER_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            <option value="todos">Todo</option>
            <option value="cuidado">Cuidado</option>
            <option value="medicamentos">Medicamentos</option>
            <option value="seguimientos">Seguimientos</option>
          </select>
        </label>
      </section>

      <CollapsibleGuide
        storageKey="residentTasks"
        title="¿Cómo funciona la bandeja del residente?"
        steps={[
          { title: "Cargar", text: "Muestra tareas recurrentes del turno generadas automáticamente." },
          { title: "Ejecutar", text: "Cumple cuidados o administra medicamentos dentro de la ventana indicada." },
          { title: "Reprogramar u omitir", text: "Si no corresponde ejecutar, deja motivo, nueva hora o trazabilidad." },
          { title: "Seguimiento", text: "Activa seguimiento cuando el equipo deba revisar la evolución después." },
        ]}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="Total" value={metrics.total} />
        <MetricCard label="Pendientes" value={metrics.pendientes} tone="amber" />
        <MetricCard label="Vencidas" value={metrics.vencidas} tone="rose" />
        <MetricCard label="Reprogramadas" value={metrics.reprogramadas} tone="sky" />
        <MetricCard label="Cuidado" value={metrics.cuidado} tone="teal" />
        <MetricCard label="Medicamentos" value={metrics.medicamentos} tone="sky" />
        <MetricCard label="Seguimientos" value={metrics.seguimientos} tone="amber" />
        <MetricCard label="Por validar" value={metrics.porValidar} tone="sky" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Buscar
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por actividad, medicamento, estado o detalle..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-950">Sin tareas para estos filtros</p>
            <p className="mt-1 text-sm text-slate-500">Cambia fecha, turno o configura el plan, medicamentos y seguimientos del residente.</p>
            <button type="button" onClick={() => load(true)} className="mt-4 rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              Generar / actualizar
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <WorkItemRow
                key={item.key}
                item={item}
                canComplete={canComplete}
                canAdminister={canAdminister}
                canValidate={canValidate}
                canResolveSeguimiento={canResolveSeguimiento}
                currentUserId={profile?.id ?? null}
                onCareAction={(action) => setCareModal({ action, row: item.row })}
                onCareReschedule={() => setRescheduleModal({ row: item.row })}
                onMedicationAction={(action) => setMedModal({ action, row: item.row })}
                onSeguimientoAction={() => setSeguimientoModal({ obs: item.row })}
              />
            ))}
          </ul>
        )}
      </section>

      <CareTaskModal modal={careModal} saving={saving} onClose={() => !saving && setCareModal(null)} onSubmit={handleCareClose} />
      <RescheduleCareTaskModal modal={rescheduleModal} saving={saving} onClose={() => !saving && setRescheduleModal(null)} onSubmit={handleCareReschedule} />
      <MedicationTaskModal modal={medModal} saving={saving} onClose={() => !saving && setMedModal(null)} onSubmit={handleMedicationSubmit} />
      <SeguimientoModal modal={seguimientoModal} saving={saving} onClose={() => !saving && setSeguimientoModal(null)} onSubmit={handleSeguimientoSubmit} />
    </div>
  );
}



export default ResidentDetails;
