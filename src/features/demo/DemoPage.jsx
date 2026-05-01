import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDemoResidents, addDemoResident,
  getDemoVitalSigns, addDemoVitalSign,
  getDemoObservations, addDemoObservation,
  clearDemoData,
} from "./demoService";
import VitalCard from "../vitalSigns/VitalCard";
import {
  STATUS,
  VITAL_DEFS,
  recordOverallLabel,
  recordOverallStatus,
} from "../vitalSigns/vitalRanges";

/* ── Constantes ─────────────────────────────────────────── */

const ESTADO_BADGE = {
  activo:        "bg-emerald-100 text-emerald-800 border-emerald-200",
  hospitalizado: "bg-amber-100 text-amber-800 border-amber-200",
  egresado:      "bg-gray-100 text-gray-700 border-gray-200",
  fallecido:     "bg-rose-100 text-rose-800 border-rose-200",
};

const ESTADO_DOT = {
  activo:        "bg-emerald-500",
  hospitalizado: "bg-amber-500",
  egresado:      "bg-gray-400",
  fallecido:     "bg-rose-500",
};

const DEPENDENCIA_TONE = {
  leve:           { bg: "bg-emerald-500", text: "text-emerald-700",  pill: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Leve" },
  moderado:       { bg: "bg-amber-500",   text: "text-amber-700",    pill: "bg-amber-50 text-amber-700 border-amber-200",       label: "Moderado" },
  severo:         { bg: "bg-orange-500",  text: "text-orange-700",   pill: "bg-orange-50 text-orange-700 border-orange-200",    label: "Severo" },
  total:          { bg: "bg-rose-500",    text: "text-rose-700",     pill: "bg-rose-50 text-rose-700 border-rose-200",          label: "Total" },
  sin_clasificar: { bg: "bg-gray-400",    text: "text-gray-600",     pill: "bg-gray-50 text-gray-600 border-gray-200",          label: "Sin clasificar" },
};

const TURNOS = ["mañana", "tarde", "noche"];

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación",
  eliminacion: "Eliminación", actividad: "Actividad", otro: "Otro",
};

const CONVERSION_TIPS = [
  "Con la versión completa sincronizas los registros de todo tu equipo en tiempo real.",
  "Activa tu cuenta para guardar datos reales y preparar tu próxima fiscalización SEREMI.",
  "Centraliza las fichas de todos tus residentes en un solo lugar, accesible desde cualquier dispositivo.",
  "Con el plan activo, cada funcionario accede con su propio usuario y los registros quedan firmados.",
];

const DEMO_DOCUMENTS = [
  {
    id: "doc-demo-1",
    categoria: "Planta Física e Infraestructura",
    nombre: "Certificado de fumigación y desratización",
    estado: "subido",
    fecha_vencimiento: new Date(Date.now() + 5 * 86400000).toISOString(),
  },
  {
    id: "doc-demo-2",
    categoria: "Autorización de Funcionamiento",
    nombre: "Resolución sanitaria vigente",
    estado: "aprobado",
    fecha_vencimiento: new Date(Date.now() + 22 * 86400000).toISOString(),
  },
  {
    id: "doc-demo-3",
    categoria: "Recursos Humanos",
    nombre: "Nómina y contratos del personal",
    estado: "pendiente",
    fecha_vencimiento: null,
  },
  {
    id: "doc-demo-4",
    categoria: "Seguridad y Plan de Emergencias",
    nombre: "Registro de simulacro de evacuación",
    estado: "subido",
    fecha_vencimiento: new Date(Date.now() + 46 * 86400000).toISOString(),
  },
];

/* ── Helpers ─────────────────────────────────────────────── */

function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const fn = new Date(fechaNacimiento);
  if (isNaN(fn)) return null;
  const today = new Date();
  let age = today.getFullYear() - fn.getFullYear();
  const m = today.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < fn.getDate())) age--;
  return age;
}

function timeAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  if (diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

function currentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

function todayDateLong() {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function isToday(d) {
  if (!d) return false;
  const x = new Date(d);
  const today = new Date();
  return x.getFullYear() === today.getFullYear() &&
    x.getMonth() === today.getMonth() &&
    x.getDate() === today.getDate();
}

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

/* ── Banner demo (sticky) ───────────────────────────────── */

function DemoBanner({ onClear }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">DEMO</span>
        <span>Datos ficticios — la información ingresada se guarda <strong>solo en este navegador</strong>.</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onClear} className="text-white/80 hover:text-white underline text-xs transition-colors">
          Borrar datos
        </button>
        <button
          onClick={() => navigate("/pago")}
          className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
        >
          Activar versión real →
        </button>
      </div>
    </div>
  );
}

function ConversionCallout({ tip, className = "" }) {
  const navigate = useNavigate();
  return (
    <div className={`bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 ${className}`}>
      <div className="shrink-0 w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white text-sm">
        ✦
      </div>
      <div className="flex-1">
        <p className="text-sm text-teal-800">{tip}</p>
        <button
          onClick={() => navigate("/pago")}
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline mt-1"
        >
          Ver planes →
        </button>
      </div>
    </div>
  );
}

/* ── Tabs ────────────────────────────────────────────────── */

function DemoNav({ tab, setTab }) {
  const tabs = [
    { id: "dashboard",  label: "Dashboard" },
    { id: "residentes", label: "Residentes" },
    { id: "signos",     label: "Signos Vitales" },
    { id: "obs",        label: "Observaciones" },
    { id: "acreditacion", label: "Acreditación" },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            tab === id
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TabDashboard — espejo del AdminDashboard pero alimentado por
   los datos del demo (mock + lo que el usuario ingresa).
   ───────────────────────────────────────────────────────────── */

function TabDashboard({ setTab }) {
  const navigate = useNavigate();
  const turno = currentShift();

  const residents = getDemoResidents();
  const vitals    = getDemoVitalSigns();
  const obs       = getDemoObservations();

  const activos = residents.filter((r) => r.estado === "activo");
  const hospitalizados = residents.filter((r) => r.estado === "hospitalizado").length;

  // Para cada activo, su último signo vital
  const latestByResident = useMemo(() => {
    const byId = {};
    for (const v of vitals) {
      if (!byId[v.residente_id]) byId[v.residente_id] = v;
    }
    return activos.map((r) => ({
      ...r,
      ultimoSigno: byId[r.id] ?? null,
    }));
  }, [residents, vitals]); // eslint-disable-line react-hooks/exhaustive-deps

  const clinical = useMemo(() => {
    const out = { critical: 0, warning: 0, normal: 0, sin: 0 };
    for (const r of latestByResident) {
      if (!r.ultimoSigno) { out.sin++; continue; }
      const s = recordOverallStatus(r.ultimoSigno);
      if (s in out) out[s]++; else out.sin++;
    }
    return out;
  }, [latestByResident]);

  const cobertura = (() => {
    if (!latestByResident.length) return null;
    const conHoy = latestByResident.filter(
      (r) => r.ultimoSigno && isToday(r.ultimoSigno.fecha_hora)
    ).length;
    return { hoy: conHoy, total: latestByResident.length, pct: Math.round((conHoy / latestByResident.length) * 100) };
  })();

  // Demografía
  const demografia = useMemo(() => {
    const ages = activos.map((r) => calcAge(r.fecha_nacimiento)).filter((a) => a != null);
    const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
    const sexos = { femenino: 0, masculino: 0, otro: 0 };
    for (const r of activos) {
      const s = (r.sexo || "otro").toLowerCase();
      sexos[s] = (sexos[s] ?? 0) + 1;
    }
    const dependencia = { leve: 0, moderado: 0, severo: 0, total: 0, sin_clasificar: 0 };
    for (const r of activos) {
      const k = r.nivel_dependencia ?? "sin_clasificar";
      dependencia[k] = (dependencia[k] ?? 0) + 1;
    }
    return { edadPromedio: avg, sexos, dependencia };
  }, [residents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actividad por turno hoy
  const activityByShift = useMemo(() => {
    const out = {
      mañana: { signos: 0, observaciones: 0 },
      tarde:  { signos: 0, observaciones: 0 },
      noche:  { signos: 0, observaciones: 0 },
    };
    for (const v of vitals) {
      if (!isToday(v.fecha_hora)) continue;
      if (out[v.turno]) out[v.turno].signos++;
    }
    for (const o of obs) {
      if (!isToday(o.fecha_hora)) continue;
      if (out[o.turno]) out[o.turno].observaciones++;
    }
    return out;
  }, [vitals, obs]);

  const followUps  = obs.filter((o) => o.requiere_seguimiento);
  const incidents  = obs.filter((o) => o.tipo === "caida" || o.tipo === "incidente");
  const signosHoy  = vitals.filter((v) => isToday(v.fecha_hora)).length;
  const obsHoy     = obs.filter((o) => isToday(o.fecha_hora)).length;
  const critical   = latestByResident.filter(
    (r) => r.ultimoSigno && recordOverallStatus(r.ultimoSigno) === "critical"
  );
  const stale = latestByResident.filter((r) => !r.ultimoSigno || !isToday(r.ultimoSigno.fecha_hora));
  const highDependency = activos.filter(
    (r) => r.nivel_dependencia === "severo" || r.nivel_dependencia === "total"
  ).length;
  const expiringDocs = DEMO_DOCUMENTS
    .filter((d) => d.fecha_vencimiento)
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
  const expiring7 = expiringDocs.filter((d) => daysUntil(d.fecha_vencimiento) <= 7).length;
  const score = Math.max(0, 100 -
    critical.length * 18 -
    clinical.warning * 8 -
    stale.length * 7 -
    followUps.length * 5 -
    expiring7 * 6
  );
  const scoreTone = score >= 80 ? "emerald" : score >= 55 ? "amber" : "rose";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-white/70 font-medium">
            {todayDateLong()} · Turno actual: <span className="capitalize">{turno}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Panel demo — ELEAM Los Aromos</h1>
          <p className="text-white/85 text-sm">Explora el dashboard que vería un administrador en producción</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm text-white/90">
            <span>📊 <strong className="text-white">{signosHoy}</strong> signos vitales hoy</span>
            <span>📋 <strong className="text-white">{obsHoy}</strong> observaciones hoy</span>
            {cobertura && (
              <span>🩺 <strong className="text-white">{cobertura.pct}%</strong> de residentes con control hoy</span>
            )}
          </div>
        </div>
      </header>

      <ManagementBrief
        score={score}
        scoreTone={scoreTone}
        stale={stale}
        followUps={followUps}
        expiring7={expiring7}
        activity={activityByShift}
        turno={turno}
        setTab={setTab}
      />

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Residentes activos"
          value={activos.length}
          sub={`${hospitalizados} hospitalizados · ${residents.length} totales`}
          icon="👴"
          tone="primary"
          onClick={() => setTab("residentes")}
        />
        <KpiCard
          title="Estado clínico"
          value={clinical.critical + clinical.warning}
          sub={
            clinical.critical > 0
              ? `${clinical.critical} crítico${clinical.critical === 1 ? "" : "s"} · ${clinical.warning} en atención`
              : clinical.warning > 0
                ? `${clinical.warning} requieren atención`
                : "Todos en rango normal"
          }
          icon="❤️"
          tone={
            clinical.critical > 0 ? "rose" : clinical.warning > 0 ? "amber" : "emerald"
          }
          onClick={() => setTab("signos")}
        />
        <KpiCard
          title="Cobertura signos hoy"
          value={cobertura ? `${cobertura.pct}%` : "—"}
          sub={cobertura ? `${cobertura.hoy} de ${cobertura.total} residentes` : "Sin residentes activos"}
          icon="📈"
          tone={
            !cobertura ? "gray" : cobertura.pct >= 80 ? "emerald" : cobertura.pct >= 40 ? "amber" : "rose"
          }
          onClick={() => setTab("signos")}
        />
        <KpiCard
          title="Categorías SEREMI"
          value="10"
          sub="DS 14/2017 — disponible al activar"
          icon="🏥"
          tone="primary"
          onClick={() => navigate("/pago")}
        />
      </section>

      {/* Critical alerts */}
      <CriticalAlerts
        critical={critical}
        followUps={followUps}
        setTab={setTab}
      />

      {/* Two-column: clinical board + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <ClinicalBoard list={latestByResident} setTab={setTab} />
        </section>
        <aside className="space-y-6">
          <RiskMatrix
            clinical={clinical}
            highDependency={highDependency}
            staleCount={stale.length}
            followUpCount={followUps.length}
          />
          <DependencyChart dist={demografia.dependencia} total={activos.length} />
          <ShiftActivity activity={activityByShift} turno={turno} />
        </aside>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FollowUpsCard items={followUps} setTab={setTab} />
        <IncidentsCard items={incidents} setTab={setTab} />
        <ExpiringDocsCard items={expiringDocs} setTab={setTab} />
      </div>

      <Demographics demografia={demografia} totalActivos={activos.length} totalResidentes={residents.length} />

      <ConversionCallout tip={CONVERSION_TIPS[0]} />

      {/* Quick actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Acciones rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon="👴" label="Ver residentes" onClick={() => setTab("residentes")} />
          <QuickAction icon="📊" label="Registrar signos vitales" onClick={() => setTab("signos")} />
          <QuickAction icon="📋" label="Nueva observación" onClick={() => setTab("obs")} />
          <QuickAction icon="🏥" label="Acreditación SEREMI" onClick={() => setTab("acreditacion")} />
        </div>
      </section>
    </div>
  );
}

/* ─── Componentes del dashboard demo ──────────────────────── */

const KPI_TONE = {
  primary: { accent: "text-[var(--color-primary)]", chip: "bg-teal-50 text-teal-700" },
  emerald: { accent: "text-emerald-700",            chip: "bg-emerald-50 text-emerald-700" },
  amber:   { accent: "text-amber-700",              chip: "bg-amber-50 text-amber-700" },
  rose:    { accent: "text-rose-700",               chip: "bg-rose-50 text-rose-700" },
  gray:    { accent: "text-gray-700",               chip: "bg-gray-100 text-gray-600" },
};

function KpiCard({ title, value, sub, icon, tone = "primary", onClick }) {
  const t = KPI_TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">{title}</span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${t.chip}`}>
          {icon}
        </span>
      </div>
      <div className={`text-3xl font-bold tabular-nums mt-2 ${t.accent}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{sub}</div>
    </button>
  );
}

function CriticalAlerts({ critical, followUps, setTab }) {
  const totalAlertas = critical.length + followUps.length;
  if (!totalAlertas) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-emerald-600 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Sin alertas críticas</p>
          <p className="text-xs text-emerald-700/80">
            Todos los residentes están en rango y no hay tareas urgentes pendientes.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-rose-600 text-lg">🚨</span>
        <h3 className="font-semibold text-rose-800">
          Atención inmediata · {totalAlertas} alerta{totalAlertas === 1 ? "" : "s"}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTab("signos")}
          className="text-left bg-white border border-rose-200 rounded-xl p-3 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
              Signos vitales críticos
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{critical.length}</div>
          <div className="text-xs text-gray-500 line-clamp-1">
            {critical.length
              ? critical.slice(0, 2).map((r) => `${r.nombre} ${r.apellido}`).join(" · ")
              : "Sin críticos"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTab("obs")}
          className="text-left bg-white border border-amber-200 rounded-xl p-3 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
              Seguimientos pendientes
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{followUps.length}</div>
          <div className="text-xs text-gray-500 line-clamp-1">
            {followUps.length ? "Observaciones marcadas para seguimiento" : "Al día"}
          </div>
        </button>
      </div>
    </div>
  );
}

function ManagementBrief({ score, scoreTone, stale, followUps, expiring7, activity, turno, setTab }) {
  const currentActivity = activity?.[turno] ?? { signos: 0, observaciones: 0 };
  const nextAction = stale.length
    ? { label: "Tomar controles pendientes", hint: `${stale.length} residente${stale.length === 1 ? "" : "s"} sin control hoy`, tab: "signos", tone: "rose" }
    : followUps.length
      ? { label: "Cerrar seguimientos", hint: `${followUps.length} observaci${followUps.length === 1 ? "ón" : "ones"} por revisar`, tab: "obs", tone: "amber" }
      : expiring7
        ? { label: "Revisar documentación", hint: `${expiring7} documento${expiring7 === 1 ? "" : "s"} vence${expiring7 === 1 ? "" : "n"} pronto`, tab: "dashboard", tone: "amber" }
        : { label: "Revisar panel clínico", hint: "Turno sin bloqueos urgentes", tab: "signos", tone: "emerald" };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={() => setTab(nextAction.tab)}
        className="lg:col-span-2 text-left bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Prioridad del turno</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1">{nextAction.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{nextAction.hint}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${nextAction.tone === "rose" ? "bg-rose-100 text-rose-700" : nextAction.tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
            Abrir
          </span>
        </div>
        {stale.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stale.slice(0, 4).map((r) => (
              <span key={r.id} className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs text-gray-600">
                <span className="h-5 w-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-bold">
                  {initials(r.nombre, r.apellido)}
                </span>
                {r.apellido}
              </span>
            ))}
          </div>
        )}
      </button>
      <BriefMetric
        label="Índice operativo"
        value={`${score}%`}
        sub={score >= 80 ? "Turno controlado" : score >= 55 ? "Requiere seguimiento" : "Riesgo operativo alto"}
        tone={scoreTone}
      />
      <BriefMetric
        label="Actividad turno actual"
        value={currentActivity.signos + currentActivity.observaciones}
        sub={`${currentActivity.signos} signos · ${currentActivity.observaciones} observaciones`}
        tone={(currentActivity.signos + currentActivity.observaciones) > 0 ? "primary" : "gray"}
      />
    </section>
  );
}

function BriefMetric({ label, value, sub, tone }) {
  const toneClass = {
    primary: "text-[var(--color-primary)] bg-teal-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-800 bg-amber-50",
    rose: "text-rose-700 bg-rose-50",
    gray: "text-gray-600 bg-gray-50",
  }[tone] ?? "text-gray-700 bg-gray-50";
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <div className={`inline-flex mt-2 rounded-xl px-3 py-1 text-3xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );
}

function RiskMatrix({ clinical, highDependency, staleCount, followUpCount }) {
  const items = [
    { label: "Críticos", value: clinical.critical, tone: clinical.critical ? "rose" : "emerald" },
    { label: "Alta dependencia", value: highDependency, tone: highDependency ? "amber" : "gray" },
    { label: "Sin control hoy", value: staleCount, tone: staleCount ? "rose" : "emerald" },
    { label: "Seguimientos", value: followUpCount, tone: followUpCount ? "amber" : "emerald" },
  ];
  return (
    <Card title="Mapa de riesgo" subtitle="Lectura rápida para priorizar el turno">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 ${riskTone(item.tone)}`}>
            <div className="text-2xl font-bold tabular-nums">{item.value}</div>
            <div className="text-[11px] font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function riskTone(tone) {
  return {
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    gray: "bg-gray-50 border-gray-100 text-gray-600",
  }[tone];
}

function ClinicalBoard({ list, setTab }) {
  const [filter, setFilter] = useState("all");

  const decorated = list.map((r) => ({
    ...r,
    status: r.ultimoSigno ? recordOverallStatus(r.ultimoSigno) : "sin",
  }));

  const counts = decorated.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    { critical: 0, warning: 0, normal: 0, unknown: 0, sin: 0 }
  );

  const filtered = decorated.filter((r) =>
    filter === "all"
      ? true
      : filter === "sin"
        ? !r.ultimoSigno
        : r.status === filter
  );
  const order = { critical: 0, warning: 1, unknown: 2, sin: 3, normal: 4 };
  filtered.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));

  return (
    <Card
      title="Estado clínico actual"
      subtitle="Último signo vital de cada residente activo"
      action={
        <button
          onClick={() => setTab("signos")}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          Ir a signos →
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label={`Todos · ${list.length}`} tone="gray" />
        <FilterPill active={filter === "critical"} onClick={() => setFilter(filter === "critical" ? "all" : "critical")} label={`Crítico · ${counts.critical}`} tone="rose" />
        <FilterPill active={filter === "warning"} onClick={() => setFilter(filter === "warning" ? "all" : "warning")} label={`Atención · ${counts.warning}`} tone="amber" />
        <FilterPill active={filter === "normal"} onClick={() => setFilter(filter === "normal" ? "all" : "normal")} label={`Normal · ${counts.normal}`} tone="emerald" />
        <FilterPill active={filter === "sin"} onClick={() => setFilter(filter === "sin" ? "all" : "sin")} label={`Sin datos · ${counts.sin}`} tone="gray" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 text-center">
          {list.length === 0 ? "No hay residentes activos." : "No hay residentes en esta categoría."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-2">
          {filtered.map((r) => (
            <ClinicalRow key={r.id} r={r} setTab={setTab} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ClinicalRow({ r, setTab }) {
  const overall = r.ultimoSigno ? recordOverallLabel(r.ultimoSigno) : { status: "unknown", label: "Sin registro" };
  const s = STATUS[overall.status];
  return (
    <li
      onClick={() => setTab("residentes")}
      className="flex items-center gap-3 px-2 py-3 hover:bg-gray-50 rounded-lg cursor-pointer"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white text-sm font-bold">
        {initials(r.nombre, r.apellido)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 truncate text-sm">
            {r.apellido}, {r.nombre}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {overall.label}
          </span>
        </div>
        <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {r.habitacion && <span>Hab. {r.habitacion}{r.cama ? ` · Cama ${r.cama}` : ""}</span>}
          {r.ultimoSigno
            ? <span>Último: {timeAgo(r.ultimoSigno.fecha_hora)}{r.ultimoSigno.turno && <span className="ml-1 capitalize text-gray-400">· {r.ultimoSigno.turno}</span>}</span>
            : <span className="text-gray-400">Sin signos vitales registrados</span>}
        </div>
      </div>
      {r.ultimoSigno && (
        <div className="hidden md:flex gap-1 shrink-0">
          {r.ultimoSigno.presion_sistolica && r.ultimoSigno.presion_diastolica && (
            <MiniPill label="P/A" value={`${r.ultimoSigno.presion_sistolica}/${r.ultimoSigno.presion_diastolica}`} />
          )}
          {r.ultimoSigno.frecuencia_cardiaca && <MiniPill label="FC" value={r.ultimoSigno.frecuencia_cardiaca} />}
          {r.ultimoSigno.temperatura != null && <MiniPill label="T°" value={`${r.ultimoSigno.temperatura}°`} />}
          {r.ultimoSigno.saturacion_oxigeno != null && <MiniPill label="SpO₂" value={`${r.ultimoSigno.saturacion_oxigeno}%`} />}
        </div>
      )}
    </li>
  );
}

function MiniPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 tabular-nums">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </span>
  );
}

const FILTER_TONE = {
  gray:    "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
  rose:    "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
  amber:   "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
  emerald: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
};

function FilterPill({ active, onClick, label, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${FILTER_TONE[tone]} ${
        active ? "ring-2 ring-offset-1 ring-[var(--color-secondary)]" : ""
      }`}
    >
      {label}
    </button>
  );
}

function DependencyChart({ dist, total }) {
  if (total === 0) {
    return (
      <Card title="Dependencia" subtitle="Distribución de residentes activos">
        <p className="text-sm text-gray-400">Sin residentes activos.</p>
      </Card>
    );
  }
  const order = ["leve", "moderado", "severo", "total", "sin_clasificar"];
  return (
    <Card title="Dependencia" subtitle="Distribución de residentes activos">
      <div className="space-y-2.5">
        {order.map((k) => {
          const v = dist[k] ?? 0;
          if (v === 0 && k === "sin_clasificar") return null;
          const pct = total ? Math.round((v / total) * 100) : 0;
          const t = DEPENDENCIA_TONE[k];
          return (
            <div key={k}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className={`${t.text} font-medium`}>{t.label}</span>
                <span className="text-gray-500 tabular-nums">{v} <span className="text-gray-400">· {pct}%</span></span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full ${t.bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShiftActivity({ activity, turno }) {
  const max = Math.max(1, ...TURNOS.map((t) => activity[t].signos + activity[t].observaciones));
  return (
    <Card title="Actividad por turno" subtitle="Registros del día">
      <div className="space-y-3">
        {TURNOS.map((t) => {
          const a = activity[t];
          const total = a.signos + a.observaciones;
          const pct = (total / max) * 100;
          const isCurrent = t === turno;
          return (
            <div key={t}>
              <div className="flex justify-between text-xs mb-1">
                <span className={`capitalize ${isCurrent ? "font-semibold text-[var(--color-primary)]" : "text-gray-600"}`}>
                  {t} {isCurrent && <span className="text-[10px] uppercase tracking-wider">· actual</span>}
                </span>
                <span className="text-gray-500 tabular-nums">{a.signos} sv · {a.observaciones} obs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                <div className="h-2 bg-[var(--color-primary)]" style={{ width: `${(a.signos / max) * 100}%` }} />
                <div className="h-2 bg-[var(--color-secondary)]" style={{ width: `${(a.observaciones / max) * 100}%` }} />
                <div className="h-2" style={{ width: `${100 - pct}%` }} />
              </div>
            </div>
          );
        })}
        <div className="flex gap-3 text-[11px] text-gray-400 pt-1">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]" /> Signos vitales</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--color-secondary)]" /> Observaciones</span>
        </div>
      </div>
    </Card>
  );
}

function Demographics({ demografia, totalActivos, totalResidentes }) {
  const fem = demografia.sexos.femenino;
  const mas = demografia.sexos.masculino;
  const otro = demografia.sexos.otro;
  const pct = (n) => (totalActivos ? Math.round((n / totalActivos) * 100) : 0);
  return (
    <Card title="Demografía" subtitle="Residentes activos">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Edad promedio" value={demografia.edadPromedio ?? "—"} sub="años" />
          <Stat label="Activos" value={totalActivos} sub={`${totalResidentes} totales`} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <SexoRow label="Femenino" value={fem} pct={pct(fem)} color="bg-pink-400" />
          <SexoRow label="Masculino" value={mas} pct={pct(mas)} color="bg-sky-400" />
          {otro > 0 && <SexoRow label="Otro" value={otro} pct={pct(otro)} color="bg-gray-400" />}
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
      <div className="text-2xl font-bold text-gray-800 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function SexoRow({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500 tabular-nums">{value} · {pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FollowUpsCard({ items, setTab }) {
  return (
    <Card
      title="Seguimientos pendientes"
      subtitle={`${items.length} observaci${items.length === 1 ? "ón" : "ones"} con seguimiento`}
      icon="⚠️"
      action={
        items.length > 0 && (
          <button onClick={() => setTab("obs")} className="text-xs text-amber-700 hover:underline">
            Ver todos →
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin seguimientos pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li key={obs.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm truncate">{obs.residente_nombre}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(obs.fecha_hora)}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">{TIPO_LABEL[obs.tipo] ?? obs.tipo}</div>
              <p className="text-xs text-gray-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function IncidentsCard({ items, setTab }) {
  return (
    <Card
      title="Incidentes y caídas"
      subtitle="Eventos del demo"
      icon="🚨"
      action={
        items.length > 0 && (
          <button onClick={() => setTab("obs")} className="text-xs text-rose-700 hover:underline">
            Ver todos →
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin incidentes registrados.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li key={obs.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm truncate">{obs.residente_nombre}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(obs.fecha_hora)}</span>
              </div>
              <div className="text-[11px] text-rose-700 font-medium">{TIPO_LABEL[obs.tipo] ?? obs.tipo}</div>
              <p className="text-xs text-gray-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExpiringDocsCard({ items, setTab }) {
  const next30 = items.filter((d) => daysUntil(d.fecha_vencimiento) <= 30);
  return (
    <Card
      title="Documentos por vencer"
      subtitle="Próximos 30 días"
      icon="📅"
      action={
        <button onClick={() => setTab("acreditacion")} className="text-xs text-amber-700 hover:underline">
          Ver módulo →
        </button>
      }
    >
      {next30.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin vencimientos próximos.</p>
      ) : (
        <ul className="space-y-2">
          {next30.slice(0, 4).map((doc) => {
            const left = daysUntil(doc.fecha_vencimiento);
            const urgent = left <= 7;
            return (
              <li key={doc.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{doc.nombre}</p>
                    <p className="text-[11px] text-gray-400 truncate">{doc.categoria}</p>
                  </div>
                  <span className={`text-xs font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-full ${urgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {left <= 0 ? "Hoy" : `${left}d`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Card({ title, subtitle, icon, action, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            {icon && <span aria-hidden>{icon}</span>}
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-[var(--color-secondary)] hover:-translate-y-0.5 transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   TabResidentes — tarjetas modernizadas con avatar e iniciales
   ───────────────────────────────────────────────────────────── */

function TabResidentes() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState(getDemoResidents);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({
    nombre: "", apellido: "", rut: "", fecha_nacimiento: "",
    sexo: "", estado: "activo", habitacion: "", cama: "",
    diagnostico_principal: "", nivel_dependencia: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    const newR = addDemoResident(form);
    setResidents((p) => [...p, newR]);
    setShowForm(false);
    setSaved(true);
    setForm({ nombre: "", apellido: "", rut: "", fecha_nacimiento: "", sexo: "",
              estado: "activo", habitacion: "", cama: "", diagnostico_principal: "",
              nivel_dependencia: "",
              fecha_ingreso: new Date().toISOString().split("T")[0] });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">Residentes</h2>
          <p className="text-sm text-gray-500">{residents.length} registrado{residents.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors"
        >
          {showForm ? "Cancelar" : "+ Agregar residente"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Residente agregado al demo (guardado en este navegador)
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Nuevo residente (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Nombre *", name: "nombre", required: true },
              { label: "Apellido *", name: "apellido", required: true },
              { label: "RUT", name: "rut", placeholder: "12.345.678-9" },
              { label: "Fecha nacimiento", name: "fecha_nacimiento", type: "date" },
              { label: "Habitación", name: "habitacion" },
              { label: "Cama", name: "cama" },
            ].map(({ label, name, type = "text", placeholder, required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type={type} name={name} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="activo">Activo</option>
                <option value="hospitalizado">Hospitalizado</option>
                <option value="egresado">Egresado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nivel dependencia</label>
              <select name="nivel_dependencia" value={form.nivel_dependencia} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="severo">Severo</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Diagnóstico principal</label>
              <input name="diagnostico_principal" value={form.diagnostico_principal} onChange={handleChange}
                placeholder="Ej: Hipertensión arterial, Diabetes tipo 2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[2]} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {residents.map((r) => {
          const estadoBadge = ESTADO_BADGE[r.estado] ?? ESTADO_BADGE.activo;
          const estadoDot = ESTADO_DOT[r.estado] ?? ESTADO_DOT.activo;
          const age = calcAge(r.fecha_nacimiento);
          const dep = DEPENDENCIA_TONE[r.nivel_dependencia];
          return (
            <article
              key={r.id}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-[var(--color-secondary)] transition-all flex flex-col"
            >
              <div className="h-2 bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-accent)]" />
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white font-bold shadow-sm">
                    {initials(r.nombre, r.apellido)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800 truncate">{r.nombre} {r.apellido}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${estadoBadge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${estadoDot}`} />
                        {r.estado}
                      </span>
                      {age != null && <span className="text-xs text-gray-500">{age} años</span>}
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-xs">
                  {r.rut && <Field label="RUT" value={r.rut} />}
                  {r.habitacion && (
                    <Field label="Ubicación" value={`Hab. ${r.habitacion}${r.cama ? ` · Cama ${r.cama}` : ""}`} />
                  )}
                  {r.fecha_ingreso && (
                    <Field label="Ingreso" value={new Date(r.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL")} />
                  )}
                  {dep && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-gray-400">Dependencia</dt>
                      <dd>
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border capitalize ${dep.pill}`}>
                          {dep.label}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>

                {r.diagnostico_principal && (
                  <p className="text-xs text-gray-500 mt-3 italic line-clamp-2">{r.diagnostico_principal}</p>
                )}

                <div className="mt-auto pt-4">
                  <button
                    onClick={() => navigate("/pago")}
                    className="w-full text-xs text-[var(--color-primary)] border border-[var(--color-primary)] px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Activar para datos reales →
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-700 truncate">{value}</dd>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TabSignos — tarjetas con código de color clínico
   ───────────────────────────────────────────────────────────── */

function TabSignos() {
  const residents = getDemoResidents().filter((r) => r.estado === "activo");
  const [records, setRecords] = useState(getDemoVitalSigns);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    residente_id: "", turno: "mañana",
    presion_sistolica: "", presion_diastolica: "", frecuencia_cardiaca: "",
    frecuencia_respiratoria: "", temperatura: "", saturacion_oxigeno: "",
    glucosa: "", dolor_escala: "0", estado_conciencia: "alerta",
  });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.residente_id) return;
    const entry = addDemoVitalSign({
      ...form,
      presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null,
      presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null,
      frecuencia_cardiaca: form.frecuencia_cardiaca ? parseInt(form.frecuencia_cardiaca) : null,
      frecuencia_respiratoria: form.frecuencia_respiratoria ? parseInt(form.frecuencia_respiratoria) : null,
      temperatura: form.temperatura ? parseFloat(form.temperatura) : null,
      saturacion_oxigeno: form.saturacion_oxigeno ? parseInt(form.saturacion_oxigeno) : null,
      glucosa: form.glucosa ? parseInt(form.glucosa) : null,
      dolor_escala: parseInt(form.dolor_escala),
    });
    setRecords((p) => [entry, ...p]);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">Signos Vitales</h2>
          <p className="text-sm text-gray-500">
            {records.length} registro{records.length !== 1 ? "s" : ""} en el demo
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors">
          {showForm ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Registro guardado en el demo
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Registrar signos vitales (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado conciencia</label>
              <select name="estado_conciencia" value={form.estado_conciencia} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="alerta">Alerta</option>
                <option value="somnoliento">Somnoliento/a</option>
                <option value="estuporoso">Estuporoso/a</option>
                <option value="coma">Coma</option>
              </select>
            </div>
            {[
              { label: "P/A Sistólica (mmHg)", name: "presion_sistolica", placeholder: "120" },
              { label: "P/A Diastólica (mmHg)", name: "presion_diastolica", placeholder: "80" },
              { label: "FC (lpm)", name: "frecuencia_cardiaca", placeholder: "72" },
              { label: "FR (rpm)", name: "frecuencia_respiratoria", placeholder: "16" },
              { label: "Temperatura (°C)", name: "temperatura", placeholder: "36.5", step: "0.1" },
              { label: "SatO₂ (%)", name: "saturacion_oxigeno", placeholder: "97" },
              { label: "Glucosa (mg/dL)", name: "glucosa", placeholder: "100" },
            ].map(({ label, name, placeholder, step }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type="number" name={name} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} step={step}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Dolor (0-10): <span className="font-bold text-gray-700">{form.dolor_escala}</span>
              </label>
              <input type="range" name="dolor_escala" value={form.dolor_escala} onChange={handleChange}
                min="0" max="10" className="w-full accent-[var(--color-primary)]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[1]} />

      <div className="space-y-4">
        {records.slice(0, 8).map((r) => (
          <DemoVitalCard key={r.id} record={r} />
        ))}
      </div>
    </div>
  );
}

function DemoVitalCard({ record }) {
  const overall = recordOverallLabel(record);
  const s = STATUS[overall.status];
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="flex flex-col sm:flex-row justify-between gap-2 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 truncate">{record.residente_nombre}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {overall.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{new Date(record.fecha_hora).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}</span>
            {record.turno && <span className="capitalize">· {record.turno}</span>}
            {record.estado_conciencia && <span className="capitalize">· {record.estado_conciencia}</span>}
          </div>
        </div>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        <VitalCard
          icon={VITAL_DEFS.presion.icon} label={VITAL_DEFS.presion.label}
          value={VITAL_DEFS.presion.format(record.presion_sistolica, record.presion_diastolica)}
          unit={VITAL_DEFS.presion.unit}
          status={VITAL_DEFS.presion.statusFor(record)} normal={VITAL_DEFS.presion.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.fc.icon} label={VITAL_DEFS.fc.label}
          value={VITAL_DEFS.fc.format(record.frecuencia_cardiaca)} unit={VITAL_DEFS.fc.unit}
          status={VITAL_DEFS.fc.statusFor(record)} normal={VITAL_DEFS.fc.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.temp.icon} label={VITAL_DEFS.temp.label}
          value={VITAL_DEFS.temp.format(record.temperatura)}
          status={VITAL_DEFS.temp.statusFor(record)} normal={VITAL_DEFS.temp.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.spo2.icon} label={VITAL_DEFS.spo2.label}
          value={VITAL_DEFS.spo2.format(record.saturacion_oxigeno)}
          status={VITAL_DEFS.spo2.statusFor(record)} normal={VITAL_DEFS.spo2.normal}
        />
        <VitalCard
          icon={VITAL_DEFS.dolor.icon} label={VITAL_DEFS.dolor.label}
          value={VITAL_DEFS.dolor.format(record.dolor_escala)}
          status={VITAL_DEFS.dolor.statusFor(record)} normal={VITAL_DEFS.dolor.normal}
        />
        {record.frecuencia_respiratoria != null && (
          <VitalCard
            icon={VITAL_DEFS.fr.icon} label={VITAL_DEFS.fr.label}
            value={VITAL_DEFS.fr.format(record.frecuencia_respiratoria)} unit={VITAL_DEFS.fr.unit}
            status={VITAL_DEFS.fr.statusFor(record)} normal={VITAL_DEFS.fr.normal}
          />
        )}
        {record.glucosa != null && (
          <VitalCard
            icon={VITAL_DEFS.glucosa.icon} label={VITAL_DEFS.glucosa.label}
            value={VITAL_DEFS.glucosa.format(record.glucosa)} unit={VITAL_DEFS.glucosa.unit}
            status={VITAL_DEFS.glucosa.statusFor(record)} normal={VITAL_DEFS.glucosa.normal}
          />
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
   TabObservaciones — sin cambios estructurales
   ───────────────────────────────────────────────────────────── */

function TabObservaciones() {
  const residents = getDemoResidents().filter((r) => r.estado !== "fallecido");
  const [records, setRecords] = useState(getDemoObservations);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    residente_id: "", turno: "mañana", tipo: "observacion_general",
    descripcion: "", acciones_tomadas: "", requiere_seguimiento: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.residente_id || !form.descripcion.trim()) return;
    const obs = addDemoObservation(form);
    setRecords((p) => [obs, ...p]);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">Observaciones Diarias</h2>
          <p className="text-sm text-gray-500">{records.length} registrada{records.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors">
          {showForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Observación guardada en el demo
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Nueva observación (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                {Object.entries(TIPO_LABEL).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripción *</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required rows={3}
                placeholder="Describa la observación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Acciones tomadas</label>
              <textarea name="acciones_tomadas" value={form.acciones_tomadas} onChange={handleChange} rows={2}
                placeholder="Acciones realizadas..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiere_seguimiento" checked={form.requiere_seguimiento}
                onChange={handleChange} className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm text-gray-600">Requiere seguimiento</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[3]} />

      <div className="grid gap-3">
        {records.slice(0, 10).map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">{r.residente_nombre}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {TIPO_LABEL[r.tipo] ?? r.tipo}
                  </span>
                  {r.requiere_seguimiento && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠ Seguimiento</span>
                  )}
                  <span className="text-xs text-gray-400 capitalize">{r.turno}</span>
                </div>
                <p className="text-sm text-gray-600">{r.descripcion}</p>
                {r.acciones_tomadas && (
                  <p className="text-xs text-gray-400 mt-1 italic">Acciones: {r.acciones_tomadas}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(r.fecha_hora).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabAcreditacion() {
  const docs = DEMO_DOCUMENTS;
  const completed = docs.filter((d) => d.estado === "aprobado" || d.estado === "subido").length;
  const pct = Math.round((completed / docs.length) * 100);
  const vencen = docs.filter((d) => d.fecha_vencimiento && daysUntil(d.fecha_vencimiento) <= 30);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">Acreditación SEREMI</h2>
          <p className="text-sm text-gray-500">
            Estado documental demo para fiscalización DS 14/2017.
          </p>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors"
        >
          Subir documento demo
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Avance documental</p>
            <p className="text-sm text-gray-600">{completed} de {docs.length} documentos listos</p>
          </div>
          <span className="text-3xl font-bold text-[var(--color-primary)] tabular-nums">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {vencen.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900">
            {vencen.length} documento{vencen.length === 1 ? "" : "s"} requiere{vencen.length === 1 ? "" : "n"} revisión antes de 30 días.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {docs.map((doc) => {
          const left = daysUntil(doc.fecha_vencimiento);
          const stateTone = {
            aprobado: "bg-emerald-100 text-emerald-700 border-emerald-200",
            subido: "bg-sky-100 text-sky-700 border-sky-200",
            pendiente: "bg-gray-100 text-gray-600 border-gray-200",
          }[doc.estado] ?? "bg-gray-100 text-gray-600 border-gray-200";
          return (
            <article key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{doc.nombre}</h3>
                    <span className={`text-xs border rounded-full px-2 py-0.5 capitalize ${stateTone}`}>
                      {doc.estado}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{doc.categoria}</p>
                </div>
                <div className="text-sm text-right">
                  {doc.fecha_vencimiento ? (
                    <>
                      <p className={`font-bold tabular-nums ${left <= 7 ? "text-rose-700" : "text-amber-700"}`}>
                        {left <= 0 ? "Vence hoy" : `Vence en ${left} días`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(doc.fecha_vencimiento).toLocaleDateString("es-CL")}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-400">Sin vencimiento</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConversionCallout tip={CONVERSION_TIPS[1]} />
    </div>
  );
}

/* ── Componente principal ────────────────────────────────── */
export default function DemoPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    if (!window.confirm("¿Borrar todos los datos que ingresaste en el demo? Los datos de ejemplo se mantendrán.")) return;
    clearDemoData();
    setCleared((p) => !p);
    setTab("dashboard");
  };

  const tabContent = {
    dashboard:  <TabDashboard key={`d-${cleared}`} setTab={setTab} />,
    residentes: <TabResidentes key={`r-${cleared}`} />,
    signos:     <TabSignos key={`s-${cleared}`} />,
    obs:        <TabObservaciones key={`o-${cleared}`} />,
    acreditacion: <TabAcreditacion key={`a-${cleared}`} />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner onClear={handleClear} />

      <div className="bg-white border-b border-gray-200 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-12">
          <DemoNav tab={tab} setTab={setTab} />
          <button
            onClick={() => navigate("/")}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-4"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tabContent[tab]}
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
        <button
          onClick={() => navigate("/pago")}
          className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold text-sm"
        >
          Activar versión real →
        </button>
      </div>
    </div>
  );
}
