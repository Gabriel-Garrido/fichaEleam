import React from "react";
import HelpTooltip from "../../components/HelpTooltip";
import NavIcon from "../../components/NavIcon";
import { KPI_TONE, ALERT_TONE, FILTER_TONE, CARD_TONE } from "./dashboardUtils";

/* ─── Card shell ──────────────────────────────────────────────── */

export function Card({ title, subtitle, action, icon, tone = "default", children }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border ${CARD_TONE[tone]} p-5`}>
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

/* ─── KPI card ────────────────────────────────────────────────── */

export function KpiCard({ title, value, sub, icon, tone = "primary", onClick, help }) {
  const t = KPI_TONE[tone];
  return (
    <article className={`group text-left ${t.bg} rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-400 font-medium inline-flex items-center gap-1.5">
          <span>{title}</span>
          {help && <HelpTooltip label={`Ayuda: ${title}`}>{help}</HelpTooltip>}
        </span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.chip}`}>
          <NavIcon id={icon} className="h-4 w-4" />
        </span>
      </div>
      <button type="button" onClick={onClick} className="mt-2 block w-full text-left">
        <div className={`text-3xl font-bold tabular-nums ${t.accent}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{sub}</div>
      </button>
    </article>
  );
}

/* ─── Quick action button ─────────────────────────────────────── */

export function QuickAction({ iconId, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-[var(--color-secondary)] hover:-translate-y-0.5 transition-all"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
        <NavIcon id={iconId} className="h-5 w-5" />
      </span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  );
}

/* ─── Alert chip ──────────────────────────────────────────────── */

export function AlertChip({ label, value, tone, onClick, hint }) {
  const t = ALERT_TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left ${t.bg} border ${t.border} rounded-xl p-3 ${
        onClick ? "hover:shadow-md transition-all cursor-pointer" : "opacity-80"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold mt-1 ${t.text}`}>{value}</div>
      <div className="text-xs text-gray-500 line-clamp-1">{hint}</div>
    </button>
  );
}

/* ─── Filter pill ─────────────────────────────────────────────── */

export function FilterPill({ active, onClick, label, tone }) {
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

/* ─── Brief metric tile ───────────────────────────────────────── */

export function BriefMetric({ label, value, status, sub, tone, help }) {
  const toneClass = {
    primary: { value: "text-[var(--color-primary)] bg-teal-50", status: "bg-teal-50 text-teal-700 border-teal-100" },
    emerald: { value: "text-emerald-700 bg-emerald-50",         status: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    amber:   { value: "text-amber-800 bg-amber-50",             status: "bg-amber-50 text-amber-800 border-amber-100" },
    rose:    { value: "text-rose-700 bg-rose-50",               status: "bg-rose-50 text-rose-700 border-rose-100" },
    gray:    { value: "text-gray-600 bg-gray-50",               status: "bg-gray-50 text-gray-600 border-gray-100" },
  }[tone] ?? { value: "text-gray-700 bg-gray-50", status: "bg-gray-50 text-gray-600 border-gray-100" };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        {help && <HelpTooltip label={`Ayuda: ${label}`}>{help}</HelpTooltip>}
      </div>
      <div className={`inline-flex mt-2 rounded-xl px-3 py-1 text-3xl font-bold tabular-nums ${toneClass.value}`}>
        {value}
      </div>
      {status && (
        <span className={`ml-2 inline-flex align-middle rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass.status}`}>
          {status}
        </span>
      )}
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );
}

/* ─── Mini vitals pills ───────────────────────────────────────── */

export function MiniVitals({ s }) {
  const Pill = ({ label, value }) =>
    value ? (
      <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 tabular-nums">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-gray-700">{value}</span>
      </span>
    ) : null;
  const pa = s.presion_sistolica && s.presion_diastolica
    ? `${s.presion_sistolica}/${s.presion_diastolica}`
    : null;
  return (
    <div className="hidden md:flex gap-1 shrink-0">
      <Pill label="P/A" value={pa} />
      <Pill label="FC" value={s.frecuencia_cardiaca} />
      <Pill label="T°" value={s.temperatura != null ? `${s.temperatura}°` : null} />
      <Pill label="SpO₂" value={s.saturacion_oxigeno != null ? `${s.saturacion_oxigeno}%` : null} />
    </div>
  );
}

/* ─── Setup action (first run) ────────────────────────────────── */

export function SetupAction({ label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-gray-100 bg-gray-50 hover:bg-teal-50 hover:border-teal-200 px-4 py-3 transition-colors"
    >
      <div className="font-semibold text-gray-800 text-sm">{label}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </button>
  );
}

/* ─── Stat tile ───────────────────────────────────────────────── */

export function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
      <div className="text-2xl font-bold text-gray-800 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

/* ─── Sexo row ────────────────────────────────────────────────── */

export function SexoRow({ label, value, pct, color }) {
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
