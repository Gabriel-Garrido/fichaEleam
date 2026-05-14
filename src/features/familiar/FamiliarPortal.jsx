import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { formatDateTime } from "../../utils/dateUtils";
import { TIPO_LABEL, calcAge } from "../residents/residentUtils";
import { VITAL_DEFS, recordOverallStatus, STATUS } from "../vitalSigns/vitalRanges";
import { logVisit } from "./familiarService";
import { summarizeFamilySnapshot } from "./familiarUtils";
import { useFamiliarResidentData } from "./useFamiliarResidentData";

function EmptyState({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-600">
      <p className="font-semibold text-slate-800">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ResidentHeader({ resident, eleam }) {
  const age = calcAge(resident?.fecha_nacimiento);
  const initials = `${resident?.nombre?.[0] ?? ""}${resident?.apellido?.[0] ?? ""}` || "R";

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-700 text-lg font-black text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
              {resident?.nombre} {resident?.apellido}
            </h2>
            <p className="text-sm text-slate-500">
              {age != null ? `${age} años · ` : ""}
              {resident?.parentesco ? `Vínculo: ${resident.parentesco}` : "Familiar autorizado"}
              {eleam?.nombre ? ` · ${eleam.nombre}` : ""}
            </p>
            {(resident?.habitacion || resident?.cama) && (
              <p className="mt-1 text-xs text-slate-400">
                Habitación {resident.habitacion ?? "-"} · Cama {resident.cama ?? "-"}
              </p>
            )}
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
          resident?.estado === "activo" ? "bg-emerald-50 text-emerald-700" :
          resident?.estado === "hospitalizado" ? "bg-amber-50 text-amber-800" :
          "bg-slate-100 text-slate-600"
        }`}>
          {resident?.estado ?? "Sin estado"}
        </span>
      </div>
    </section>
  );
}

function ResidentSelector({ residentes, activeId, onSelect }) {
  if (residentes.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {residentes.map((resident) => (
        <button
          type="button"
          key={resident.id}
          onClick={() => onSelect(resident.id)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            resident.id === activeId
              ? "border-teal-700 bg-teal-700 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {resident.nombre} {resident.apellido}
        </button>
      ))}
    </div>
  );
}

function VitalsPanel({ vitals }) {
  if (!vitals?.length) {
    return (
      <Panel title="Salud reciente">
        <EmptyState title="Sin signos vitales recientes">
          El equipo aún no ha publicado registros visibles para este residente.
        </EmptyState>
      </Panel>
    );
  }

  const latest = vitals[0];
  const overall = recordOverallStatus(latest);
  const overallStyle = STATUS[overall] ?? STATUS.unknown;

  return (
    <Panel
      title="Salud reciente"
      action={
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${overallStyle.badge}`}>
          {overallStyle.label}
        </span>
      }
    >
      <p className="mb-3 text-sm text-slate-500">Último control · {formatDateTime(latest.fecha_hora)}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(VITAL_DEFS).map(([key, def]) => {
          const status = def.statusFor(latest);
          const tone = STATUS[status] ?? STATUS.unknown;
          const field = {
            fc: "frecuencia_cardiaca",
            fr: "frecuencia_respiratoria",
            temp: "temperatura",
            spo2: "saturacion_oxigeno",
            glucosa: "glucosa",
            dolor: "dolor_escala",
          }[key] ?? key;
          const value = key === "presion"
            ? def.format(latest.presion_sistolica, latest.presion_diastolica)
            : def.format(latest[field]);

          return (
            <div key={key} className={`rounded-xl border bg-white p-3 ring-1 ${tone.ring}`}>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {def.label}
              </p>
              <p className={`mt-1 truncate text-lg font-black ${tone.text}`}>
                {value} <span className="text-xs font-semibold text-slate-400">{def.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SnapshotMetric({ label, value, tone = "slate" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function DailySummary({ care, medications }) {
  const summary = summarizeFamilySnapshot({ care, medications });

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SnapshotMetric label="Cuidados hechos" value={summary.careDone} tone={summary.careDone ? "emerald" : "slate"} />
      <SnapshotMetric label="Cuidados pendientes" value={summary.carePending} tone={summary.carePending ? "amber" : "emerald"} />
      <SnapshotMetric label="Medicamentos dados" value={summary.medicationsDone} tone={summary.medicationsDone ? "teal" : "slate"} />
      <SnapshotMetric label="Medicamentos pendientes" value={summary.medicationsPending} tone={summary.medicationsPending ? "amber" : "emerald"} />
    </div>
  );
}

function StatusList({ items, emptyTitle, renderItem }) {
  if (!items?.length) return <EmptyState title={emptyTitle} />;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

function ObservationsPanel({ observations }) {
  return (
    <Panel title="Actualizaciones del equipo">
      <StatusList
        items={observations}
        emptyTitle="Sin actualizaciones publicadas para familia"
        renderItem={(item) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-3 text-sm text-slate-700">{item.resumen}</p>
              {item.requiere_seguimiento && (
                <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  Seguimiento activo
                </span>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {TIPO_LABEL[item.tipo] ?? item.tipo}
              </p>
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.fecha_hora)}</p>
            </div>
          </div>
        )}
      />
    </Panel>
  );
}

function CarePanel({ care }) {
  return (
    <Panel title="Cuidados de hoy">
      <StatusList
        items={care}
        emptyTitle="Sin cuidados publicados para familia hoy"
        renderItem={(item) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{item.titulo}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.resumen}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {item.estado}
            </span>
          </div>
        )}
      />
    </Panel>
  );
}

function MedicationPanel({ medications }) {
  return (
    <Panel title="Medicación de hoy">
      <StatusList
        items={medications}
        emptyTitle="Sin medicación publicada para familia hoy"
        renderItem={(item) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{item.resumen}</p>
              <p className="mt-1 text-sm text-slate-500">{item.via ? `Vía ${item.via}` : "Indicación visible para familia"}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {item.estado}
            </span>
          </div>
        )}
      />
    </Panel>
  );
}

function VisitsPanel({ visits, onLogVisit, logging, onOpenVisits }) {
  return (
    <Panel
      title="Visitas"
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenVisits} className="text-sm font-semibold text-teal-700 hover:underline">
            Ver historial
          </button>
          <Button
            onClick={onLogVisit}
            disabled={logging}
            className="min-h-8 bg-teal-700 px-3 py-1.5 text-xs text-white hover:bg-teal-800"
          >
            {logging ? "Guardando..." : "Registrar ahora"}
          </Button>
        </div>
      }
    >
      <StatusList
        items={visits?.slice(0, 5)}
        emptyTitle="Aún no tienes visitas registradas"
        renderItem={(visit) => (
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {formatDateTime(visit.fecha_hora)}
              {visit.duracion_min ? <span className="font-normal text-slate-500"> · {visit.duracion_min} min</span> : null}
            </p>
            {visit.notas && <p className="mt-1 text-sm text-slate-500">{visit.notas}</p>}
          </div>
        )}
      />
    </Panel>
  );
}

export default function FamiliarPortal() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, eleam } = useAuth();
  const [logging, setLogging] = useState(false);
  const {
    residentes,
    activeId,
    activeResident,
    snapshot,
    loading,
    loadingSnapshot,
    error,
    selectResident,
    reload,
  } = useFamiliarResidentData({ toast });

  const resident = snapshot?.resident ?? activeResident;
  const vitals = snapshot?.vitals ?? [];
  const observations = snapshot?.observations ?? [];
  const care = snapshot?.care ?? [];
  const medications = snapshot?.medications ?? [];
  const visits = snapshot?.visits ?? [];

  const handleLogVisit = async () => {
    if (!activeId) return;
    setLogging(true);
    try {
      await logVisit({ residenteId: activeId });
      toast("Visita registrada", "success");
      await reload();
    } catch {
      toast("No se pudo registrar la visita. Intenta de nuevo.", "error");
    } finally {
      setLogging(false);
    }
  };

  if (loading && residentes.length === 0) {
    return <Loading message="Cargando información del residente..." />;
  }

  if (residentes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Sin residentes asignados</h1>
        <p className="text-slate-500">
          Aún no estás vinculado a un residente. Pide al administrador del ELEAM que cree el vínculo.
        </p>
      </div>
    );
  }

  return (
    <PageLayout
      title={profile?.nombre ? `Hola, ${profile.nombre.split(" ")[0]}` : "Portal familiar"}
      eyebrow="Portal familiar"
      description={`Resumen autorizado de ${resident?.nombre ?? "tu familiar"}${eleam?.nombre ? ` en ${eleam.nombre}` : ""}.`}
      size="lg"
      actions={
        <Button
          onClick={() => navigate("/familiar/visitas")}
          className="bg-white text-teal-700 border border-teal-200 hover:bg-teal-50"
        >
          Gestionar visitas
        </Button>
      }
      className="space-y-5"
    >
      <ResidentSelector residentes={residentes} activeId={activeId} onSelect={selectResident} />
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {resident && <ResidentHeader resident={resident} eleam={eleam} />}
      {loadingSnapshot && snapshot && (
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Actualizando información...
        </div>
      )}

      <DailySummary care={care} medications={medications} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <VitalsPanel vitals={vitals} />
        <VisitsPanel
          visits={visits}
          onLogVisit={handleLogVisit}
          logging={logging}
          onOpenVisits={() => navigate("/familiar/visitas")}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CarePanel care={care} />
        <MedicationPanel medications={medications} />
      </div>

      <ObservationsPanel observations={observations} />
    </PageLayout>
  );
}
