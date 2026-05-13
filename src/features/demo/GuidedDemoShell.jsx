import React, { useCallback, useMemo, useState } from "react";
import OnboardingGuide, {
  ADMIN_STEPS,
  FUNCIONARIO_STEPS,
  FAMILIAR_STEPS,
} from "./OnboardingGuide";
import ContactSpecialistButton from "./ContactSpecialistButton";
import {
  DEMO_ELEAM,
  DEMO_RESIDENTES,
  DEMO_SIGNOS,
  DEMO_OBSERVACIONES,
  DEMO_VISITAS,
  DEMO_ACRED_AMBITOS,
  DEMO_ACRED_KPI,
  DEMO_RESIDENTE_FAMILIAR,
} from "./demoData";
import { trackEvent } from "../landing/landingAnalytics";
import DemoRequestModal from "../landing/DemoRequestModal";
import { formatDate, formatDateTime } from "../../utils/dateUtils";

const ROLES = [
  { id: "admin",      label: "Vista Admin",       badge: "Administrador" },
  { id: "funcionario", label: "Vista Funcionario", badge: "Funcionario" },
  { id: "familiar",   label: "Vista Familiar",     badge: "Familiar" },
];

const PANEL_ORDER = {
  admin:       ["dashboard","residents","vitals","observations","accreditation","team"],
  funcionario: ["dashboard","vitals","observations","residents"],
  familiar:    ["portal","vitals_view","obs_view","visitas"],
};

function statusColor(val, type) {
  if (val == null) return "bg-slate-100 text-slate-500";
  switch (type) {
    case "sistolica": return val < 90 || val >= 180 ? "bg-red-100 text-red-700" : val < 100 || val >= 140 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
    case "sat": return val < 90 ? "bg-red-100 text-red-700" : val < 95 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
    case "dolor": return val >= 7 ? "bg-red-100 text-red-700" : val >= 4 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
    default: return "bg-green-100 text-green-700";
  }
}

function Badge({ children, color = "bg-teal-100 text-teal-700" }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{children}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Panel components ──────────────────────────────────────────

function DashboardPanel() {
  const alertas = DEMO_SIGNOS.filter((s) => s.saturacion_oxigeno < 95 || s.presion_sistolica >= 140 || s.dolor_escala >= 4);
  return (
    <div className="space-y-6">
      <SectionTitle sub="Resumen operativo de hoy">Dashboard · {DEMO_ELEAM.nombre}</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Residentes activos", value: DEMO_RESIDENTES.length, color: "text-teal-600" },
          { label: "Signos registrados hoy", value: "5", color: "text-blue-600" },
          { label: "Obs. de turno hoy", value: "5", color: "text-purple-600" },
          { label: "Alertas activas", value: alertas.length, color: alertas.length > 0 ? "text-red-600" : "text-green-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 text-sm mb-2">Alertas clínicas activas</h3>
          <ul className="space-y-1">
            {alertas.map((a) => (
              <li key={a.id} className="text-sm text-red-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                {a.residente_nombre} — {a.saturacion_oxigeno < 95 ? `SatO₂ ${a.saturacion_oxigeno}%` : a.dolor_escala >= 4 ? `Dolor ${a.dolor_escala}/10` : `PA ${a.presion_sistolica}/${a.presion_diastolica}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Últimas observaciones</h3>
        <div className="space-y-2">
          {DEMO_OBSERVACIONES.slice(0,3).map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-slate-100 p-3 flex gap-3">
              <div className="shrink-0">
                <Badge color="bg-purple-100 text-purple-700">{o.tipo}</Badge>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">{o.residente_nombre}</p>
                <p className="text-xs text-slate-500 truncate">{o.descripcion}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{o.autor} · {formatDateTime(o.creado_en)}</p>
              </div>
              {o.requiere_seguimiento && <Badge color="bg-amber-100 text-amber-700">Seguimiento</Badge>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidentsPanel() {
  const [sel, setSel] = useState(null);
  if (sel) {
    const r = sel;
    return (
      <div className="space-y-4">
        <button onClick={() => setSel(null)} className="text-sm text-teal-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a lista
        </button>
        <SectionTitle>Ficha de {r.nombre} {r.apellido}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-sm">
            <h3 className="font-semibold text-slate-700 text-sm">Datos personales</h3>
            {[
              ["RUT", r.rut],
              ["Fecha nacimiento", formatDate(r.fecha_nacimiento)],
              ["Sexo", r.sexo],
              ["Estado civil", r.estado_civil],
              ["Habitación / Cama", `${r.habitacion} / ${r.cama}`],
              ["Ingreso", formatDate(r.fecha_ingreso)],
            ].map(([k,v]) => (
              <div key={k} className="flex gap-2 text-sm">
                <span className="text-slate-400 w-32 shrink-0">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-sm">
            <h3 className="font-semibold text-slate-700 text-sm">Información clínica</h3>
            <div>
              <p className="text-xs text-slate-400">Diagnóstico principal</p>
              <p className="text-sm font-medium text-slate-800">{r.diagnostico_principal}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Alergias</p>
              <p className="text-sm font-medium text-slate-800">{r.alergias.length ? r.alergias.join(", ") : "Sin alergias conocidas"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Índice Barthel</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${r.indice_barthel}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700">{r.indice_barthel}/100</span>
              </div>
              <Badge color={
                r.nivel_dependencia === "total" ? "bg-red-100 text-red-700" :
                r.nivel_dependencia === "severo" ? "bg-orange-100 text-orange-700" :
                r.nivel_dependencia === "moderado" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }>{r.nivel_dependencia}</Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SectionTitle sub="5 residentes activos">Residentes · {DEMO_ELEAM.nombre}</SectionTitle>
      <div className="grid gap-3">
        {DEMO_RESIDENTES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSel(r)}
            className="text-left bg-white rounded-xl border border-slate-100 p-4 hover:border-teal-200 hover:shadow-sm transition-all flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-slate-800">{r.nombre} {r.apellido}</p>
              <p className="text-xs text-slate-500">{r.rut} · Hab. {r.habitacion}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.diagnostico_principal}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge color="bg-green-100 text-green-700">activo</Badge>
              <Badge color={
                r.nivel_dependencia === "total" ? "bg-red-100 text-red-700" :
                r.nivel_dependencia === "severo" ? "bg-orange-100 text-orange-700" :
                r.nivel_dependencia === "moderado" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }>{r.nivel_dependencia}</Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function VitalsPanel({ showForm = false }) {
  const [form, setForm] = useState(false);
  const sf = showForm || form;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <SectionTitle sub="Registros con rangos clínicos para adultos mayores">Signos Vitales</SectionTitle>
        {!sf && (
          <button
            onClick={() => setForm(true)}
            className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-700 shrink-0"
          >
            + Nuevo registro
          </button>
        )}
      </div>
      {sf && (
        <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Nuevo registro de signos vitales</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Presión sistólica (mmHg)", placeholder: "120", hint: "Normal: 100–139" },
              { label: "Presión diastólica (mmHg)", placeholder: "80", hint: "Normal: 60–89" },
              { label: "Frec. cardíaca (lpm)", placeholder: "72", hint: "Normal: 60–100" },
              { label: "Temperatura (°C)", placeholder: "36.5", hint: "Normal: 36–37.7" },
              { label: "SatO₂ (%)", placeholder: "97", hint: "Normal: ≥95%" },
              { label: "Dolor (0–10)", placeholder: "2", hint: "Normal: 0–3" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                <input
                  type="number"
                  placeholder={f.placeholder}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">{f.hint}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setForm(false)} className="text-sm text-slate-500 hover:underline">Cancelar</button>
            <button className="bg-teal-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-teal-700">Guardar (demo)</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {DEMO_SIGNOS.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm text-slate-800">{s.residente_nombre}</p>
                <p className="text-xs text-slate-400">{formatDateTime(s.fecha_hora)} · Turno {s.turno}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-xl text-xs font-semibold ${statusColor(s.presion_sistolica, "sistolica")}`}>
                PA {s.presion_sistolica}/{s.presion_diastolica}
              </span>
              <span className="px-2 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
                FC {s.frecuencia_cardiaca}
              </span>
              <span className={`px-2 py-1 rounded-xl text-xs font-semibold ${statusColor(s.saturacion_oxigeno, "sat")}`}>
                SatO₂ {s.saturacion_oxigeno}%
              </span>
              <span className="px-2 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
                T° {s.temperatura}°C
              </span>
              {s.dolor_escala != null && (
                <span className={`px-2 py-1 rounded-xl text-xs font-semibold ${statusColor(s.dolor_escala, "dolor")}`}>
                  Dolor {s.dolor_escala}/10
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObservationsPanel({ showForm = false }) {
  const [form, setForm] = useState(false);
  const sf = showForm || form;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <SectionTitle sub="12 tipos de observaciones diarias">Observaciones de Turno</SectionTitle>
        {!sf && (
          <button
            onClick={() => setForm(true)}
            className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-700 shrink-0"
          >
            + Nueva obs.
          </button>
        )}
      </div>
      {sf && (
        <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Nueva observación</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Residente</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {DEMO_RESIDENTES.map((r) => (
                  <option key={r.id}>{r.nombre} {r.apellido}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {["clinica","alimentacion","higiene","comportamiento","rehabilitacion","bienestar","medicacion","social","caida","dolor","eliminacion","otro"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descripción</label>
            <textarea rows={3} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Describe la observación..." />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setForm(false)} className="text-sm text-slate-500 hover:underline">Cancelar</button>
            <button className="bg-teal-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-teal-700">Guardar (demo)</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {DEMO_OBSERVACIONES.map((o) => (
          <div key={o.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-slate-800">{o.residente_nombre}</p>
                <p className="text-xs text-slate-400">{formatDateTime(o.creado_en)} · {o.autor}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge color="bg-purple-100 text-purple-700">{o.tipo}</Badge>
                <Badge color="bg-blue-100 text-blue-700">{o.turno}</Badge>
                {o.requiere_seguimiento && <Badge color="bg-amber-100 text-amber-700">Seguimiento</Badge>}
              </div>
            </div>
            <p className="text-sm text-slate-700">{o.descripcion}</p>
            {o.acciones_tomadas && (
              <p className="text-xs text-slate-500 mt-1 italic">Acciones: {o.acciones_tomadas}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccreditationPanel() {
  const { pct, cumple, pendiente, vencido, observado } = DEMO_ACRED_KPI;
  return (
    <div className="space-y-4">
      <SectionTitle sub="Carpeta DS 14/2017 · 14 ámbitos">Acreditación SEREMI</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Cumplimiento", value: `${pct}%`, color: "text-teal-600" },
          { label: "Cumplen", value: cumple, color: "text-green-600" },
          { label: "Pendientes", value: pendiente, color: "text-amber-600" },
          { label: "Vencidos", value: vencido, color: "text-orange-600" },
          { label: "Observados", value: observado, color: "text-red-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {DEMO_ACRED_AMBITOS.map((a) => {
          const total = a.cumple + (a.pendiente ?? 0) + (a.vencido ?? 0);
          const pctA  = total > 0 ? Math.round((a.cumple / total) * 100) : 0;
          return (
            <div key={a.codigo} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 w-10 shrink-0">{a.codigo}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{a.nombre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${pctA}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">{a.cumple}/{total}</span>
                </div>
              </div>
              <Badge color={
                pctA === 100 ? "bg-green-100 text-green-700" :
                pctA >= 70  ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }>{pctA}%</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamPanel() {
  return (
    <div className="space-y-4">
      <SectionTitle sub="Gestión de accesos y permisos">Equipo · {DEMO_ELEAM.nombre}</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { nombre: "Paola Díaz R.", cargo: "Enfermera", rol: "Funcionario", permisos: ["crear_signos","crear_observacion","subir_acreditacion"] },
          { nombre: "Roberto Salinas V.", cargo: "TENS", rol: "Funcionario", permisos: ["crear_signos","crear_observacion"] },
          { nombre: "Marcos Pinto A.", cargo: "Kinesiólogo", rol: "Funcionario", permisos: ["crear_observacion"] },
          { nombre: "Claudia Muñoz T.", cargo: "Terapeuta Ocup.", rol: "Funcionario", permisos: ["crear_observacion"] },
        ].map((m) => (
          <div key={m.nombre} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-slate-800">{m.nombre}</p>
                <p className="text-xs text-slate-500">{m.cargo}</p>
              </div>
              <Badge color="bg-blue-100 text-blue-700">{m.rol}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {m.permisos.map((p) => (
                <span key={p} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <p className="text-sm text-teal-800 font-semibold mb-1">Invitar miembro del equipo</p>
        <p className="text-xs text-teal-700">En la versión real puedes invitar funcionarios por email y asignar permisos granulares por cada acción del sistema.</p>
      </div>
    </div>
  );
}

function FamiliarPortalPanel() {
  const r = DEMO_RESIDENTE_FAMILIAR;
  const ultimos = DEMO_SIGNOS.filter((s) => s.residente_id === r.id).slice(0, 2);
  const obs     = DEMO_OBSERVACIONES.filter((o) => o.residente_id === r.id).slice(0, 2);
  return (
    <div className="space-y-4">
      <SectionTitle sub="Tu portal de familiar">Portal Familiar</SectionTitle>
      <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-800">{r.nombre} {r.apellido}</p>
            <p className="text-sm text-slate-500">{r.diagnostico_principal}</p>
            <p className="text-xs text-slate-400 mt-1">Hab. {r.habitacion} · Ingreso {formatDate(r.fecha_ingreso)}</p>
          </div>
          <Badge color="bg-green-100 text-green-700">{r.estado}</Badge>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">Últimos signos vitales</h3>
          {ultimos.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-3 mb-2 shadow-sm">
              <p className="text-xs text-slate-400 mb-2">{formatDateTime(s.fecha_hora)}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor(s.presion_sistolica, "sistolica")}`}>PA {s.presion_sistolica}/{s.presion_diastolica}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor(s.saturacion_oxigeno, "sat")}`}>SatO₂ {s.saturacion_oxigeno}%</span>
                <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">T° {s.temperatura}°C</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">Observaciones recientes</h3>
          {obs.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-slate-100 p-3 mb-2 shadow-sm">
              <div className="flex gap-1 mb-1">
                <Badge color="bg-purple-100 text-purple-700">{o.tipo}</Badge>
              </div>
              <p className="text-xs text-slate-700 line-clamp-2">{o.descripcion}</p>
              <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(o.creado_en)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisitasPanel() {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <SectionTitle sub="Historial de visitas a tu familiar">Mis Visitas</SectionTitle>
        <button
          onClick={() => setShowForm(true)}
          className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-700 shrink-0"
        >
          + Registrar visita
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Registrar visita</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha y hora</label>
              <input type="datetime-local" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Duración (minutos)</label>
              <input type="number" placeholder="60" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notas (opcional)</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none" placeholder="¿Cómo estuvo la visita?" />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:underline">Cancelar</button>
            <button className="bg-teal-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-teal-700">Guardar (demo)</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {DEMO_VISITAS.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-slate-800">{v.familiar_nombre}</p>
                <p className="text-xs text-slate-400">{formatDateTime(v.fecha_hora)}</p>
              </div>
              <Badge color="bg-blue-100 text-blue-700">{v.duracion_min} min</Badge>
            </div>
            {v.notas && <p className="text-xs text-slate-600 mt-2 italic">{v.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

const PANEL_COMPONENTS = {
  dashboard:    <DashboardPanel />,
  residents:    <ResidentsPanel />,
  vitals:       <VitalsPanel />,
  observations: <ObservationsPanel />,
  accreditation: <AccreditationPanel />,
  team:         <TeamPanel />,
  portal:       <FamiliarPortalPanel />,
  vitals_view:  <VitalsPanel />,
  obs_view:     <ObservationsPanel />,
  visitas:      <VisitasPanel />,
};

// ── Main shell ────────────────────────────────────────────────

export default function GuidedDemoShell({ token, onProgresoUpdate }) {
  const [role, setRole]           = useState("admin");
  const [activePanel, setActivePanel] = useState("dashboard");
  const [guideVisible, setGuideVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Track completed panels per role
  const [completed, setCompleted] = useState({ admin: [], funcionario: [], familiar: [] });

  const markCompleted = useCallback((r, panel) => {
    setCompleted((prev) => {
      if (prev[r].includes(panel)) return prev;
      const next = { ...prev, [r]: [...prev[r], panel] };
      const totalPanels = PANEL_ORDER.admin.length + PANEL_ORDER.funcionario.length + PANEL_ORDER.familiar.length;
      const totalDone   = next.admin.length + next.funcionario.length + next.familiar.length;
      const pct = Math.round((totalDone / totalPanels) * 100);
      onProgresoUpdate?.({
        admin_steps:  next.admin.length,
        func_steps:   next.funcionario.length,
        fam_steps:    next.familiar.length,
        pct,
      });
      return next;
    });
  }, [onProgresoUpdate]);

  const goToPanel = useCallback((panel) => {
    setActivePanel(panel);
    markCompleted(role, panel);
    trackEvent("demo_step", `${role}_${panel}`);
  }, [role, markCompleted]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    const firstPanel = PANEL_ORDER[newRole][0];
    setActivePanel(firstPanel);
    markCompleted(newRole, firstPanel);
    trackEvent("demo_step", `${newRole}_${firstPanel}`);
  };

  const handleNext = () => {
    const panels = PANEL_ORDER[role];
    const idx = panels.indexOf(activePanel);
    if (idx < panels.length - 1) {
      goToPanel(panels[idx + 1]);
    }
  };

  const totalProgress = useMemo(() => {
    const totalPanels = PANEL_ORDER.admin.length + PANEL_ORDER.funcionario.length + PANEL_ORDER.familiar.length;
    const totalDone   = completed.admin.length + completed.funcionario.length + completed.familiar.length;
    return Math.round((totalDone / totalPanels) * 100);
  }, [completed]);

  const allDone = totalProgress === 100;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-base font-black text-teal-700 tracking-tight">FichaEleam</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Demo</span>
          <span className="text-xs text-slate-400 hidden sm:block">{DEMO_ELEAM.nombre}</span>
        </div>

        {/* Role tabs */}
        <div className="flex items-center gap-1">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRoleChange(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                role === r.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 bg-slate-100 rounded-full h-1.5">
              <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${totalProgress}%` }} />
            </div>
            <span className="text-xs text-slate-500">{totalProgress}%</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-teal-600 text-white text-xs px-3 py-1.5 rounded-xl hover:bg-teal-700 font-semibold hidden sm:block"
          >
            Hablar con especialista
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Guide sidebar */}
        {guideVisible && (
          <OnboardingGuide
            role={role}
            activePanel={activePanel}
            completedSteps={completed[role]}
            onGoToStep={goToPanel}
            onNext={handleNext}
            onDismiss={() => setGuideVisible(false)}
            totalProgress={totalProgress}
          />
        )}

        {!guideVisible && (
          <button
            onClick={() => setGuideVisible(true)}
            className="w-9 shrink-0 bg-white border-r border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-teal-600"
            title="Mostrar guía"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {PANEL_COMPONENTS[activePanel] ?? <DashboardPanel />}
        </main>
      </div>

      {/* All-done popup */}
      {allDone && !showModal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-white border border-teal-200 rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4">
          <p className="font-bold text-slate-800 mb-1">¡Viste todo FichaEleam!</p>
          <p className="text-sm text-slate-600 mb-4">¿Listo para activar tu ELEAM?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 bg-teal-600 text-white text-sm py-2 rounded-xl font-semibold hover:bg-teal-700"
            >
              Hablar con especialista
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 border border-teal-600 text-teal-700 text-sm py-2 rounded-xl font-semibold hover:bg-teal-50"
            >
              Hablar con especialista
            </button>
          </div>
        </div>
      )}

      <ContactSpecialistButton token={token} />
      <DemoRequestModal isOpen={showModal} onClose={() => setShowModal(false)} defaultCta="demo_completed" />
    </div>
  );
}
