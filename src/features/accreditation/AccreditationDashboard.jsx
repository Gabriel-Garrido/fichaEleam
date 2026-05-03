import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import {
  getRequisitosEleam,
  getObservaciones,
  buildResumen,
  estadoMeta,
  formatDate,
  diasHasta,
} from "./accreditationService";

function StatCard({ label, value, sub, tone = "primary" }) {
  const tones = {
    primary: "text-[var(--color-primary)]",
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    rose:    "text-rose-600",
    slate:   "text-slate-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className={`text-3xl font-black tabular-nums mt-1 ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Bar({ pct, tone = "emerald" }) {
  const colorClass =
    tone === "emerald" ? "from-emerald-400 to-emerald-600" :
    tone === "amber"   ? "from-amber-400 to-amber-600" :
    tone === "rose"    ? "from-rose-400 to-rose-600" :
                         "from-teal-400 to-[var(--color-primary)]";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 bg-gradient-to-r ${colorClass} rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AmbitoCard({ ambito, onClick }) {
  const tone = ambito.porcentaje >= 80 ? "emerald" : ambito.porcentaje >= 50 ? "amber" : "rose";
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl">{ambito.icono ?? "📁"}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">{ambito.codigo}</p>
        </div>
        <span className="text-2xl font-black text-gray-800 tabular-nums">{ambito.porcentaje}%</span>
      </div>
      <h3 className="font-bold text-gray-800 leading-tight mb-3 line-clamp-2">{ambito.nombre}</h3>
      <Bar pct={ambito.porcentaje} tone={tone} />
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          {ambito.cumple ?? 0} ok
        </span>
        {(ambito.pendiente ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            {ambito.pendiente} pendiente{ambito.pendiente !== 1 ? "s" : ""}
          </span>
        )}
        {(ambito.observado ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            {ambito.observado} observado{ambito.observado !== 1 ? "s" : ""}
          </span>
        )}
        {(ambito.vencido ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-rose-500 rounded-full" />
            {ambito.vencido} vencido{ambito.vencido !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

function AlertItem({ requisito_eleam, kind = "vencido" }) {
  const navigate = useNavigate();
  const tone = kind === "vencido"
    ? { box: "bg-rose-50 border-rose-200", txt: "text-rose-800", chip: "bg-rose-100 text-rose-700" }
    : { box: "bg-amber-50 border-amber-200", txt: "text-amber-800", chip: "bg-amber-100 text-amber-700" };

  const dias = diasHasta(requisito_eleam.fecha_vencimiento);
  const r = requisito_eleam.requisito;
  return (
    <button
      onClick={() => navigate(`/accreditation/requisito/${requisito_eleam.id}`)}
      className={`w-full text-left ${tone.box} border rounded-xl p-3 hover:shadow-sm transition-all flex items-center justify-between gap-3`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${tone.txt} truncate`}>
          {r?.codigo} · {r?.nombre}
        </p>
        <p className="text-xs text-gray-600 truncate">
          {r?.ambito?.nombre} · Vence {formatDate(requisito_eleam.fecha_vencimiento)}
        </p>
      </div>
      <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-1 ${tone.chip}`}>
        {kind === "vencido"
          ? `Hace ${Math.abs(dias ?? 0)}d`
          : `En ${dias ?? "?"}d`}
      </span>
    </button>
  );
}

function ObservacionItem({ obs }) {
  const navigate = useNavigate();
  const r = obs.requisito_eleam?.requisito;
  return (
    <button
      onClick={() => obs.requisito_eleam_id
        ? navigate(`/accreditation/requisito/${obs.requisito_eleam_id}`)
        : navigate(`/accreditation/observaciones`)}
      className="w-full text-left bg-orange-50 border border-orange-200 rounded-xl p-3 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase font-bold tracking-wide text-orange-700">
          {obs.origen === "fiscalizacion" ? "Fiscalización" : "Interna"}
        </span>
        {r && (
          <span className="text-[11px] text-gray-600 truncate">
            · {r.codigo} {r.nombre}
          </span>
        )}
      </div>
      <p className="text-sm text-orange-900 line-clamp-2">{obs.descripcion}</p>
      {obs.fecha_compromiso && (
        <p className="text-xs text-orange-700 mt-1">
          Compromiso: {formatDate(obs.fecha_compromiso)}
        </p>
      )}
    </button>
  );
}

export default function AccreditationDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, isAdminEleam } = useAuth();
  const [requisitos, setRequisitos] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getRequisitosEleam(),
      getObservaciones({ soloAbiertas: true }),
    ])
      .then(([r, o]) => {
        if (!active) return;
        setRequisitos(r);
        setObservaciones(o);
      })
      .catch((e) => active && toast(e.message || "Error", "error"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [toast]);

  const resumen = useMemo(() => buildResumen(requisitos), [requisitos]);

  if (loading) return <Loading message="Cargando carpeta SEREMI..." />;

  const cumplimientoTone = resumen.porcentaje >= 80 ? "emerald" : resumen.porcentaje >= 50 ? "amber" : "rose";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[var(--color-primary)]">Carpeta SEREMI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Documentación, requisitos y observaciones para fiscalización (DS 14/2017).
            {eleam?.nombre ? <> · <span className="font-semibold">{eleam.nombre}</span></> : null}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/accreditation/observaciones")}
            className="border border-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            Observaciones
          </button>
          <button
            onClick={() => navigate("/accreditation/carpeta")}
            className="bg-[var(--color-primary)] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)] text-sm"
          >
            Generar Carpeta SEREMI
          </button>
        </div>
      </header>

      {/* Cumplimiento global */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Cumplimiento global</p>
            <p className="text-sm text-gray-600">
              {resumen.cumple} de {resumen.total - resumen.noAplica} requisitos al día
              {resumen.noAplica > 0 ? <> · {resumen.noAplica} marcados como no aplica</> : null}
            </p>
          </div>
          <p className="text-5xl font-black text-[var(--color-primary)] tabular-nums">{resumen.porcentaje}%</p>
        </div>
        <Bar pct={resumen.porcentaje} tone={cumplimientoTone} />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total requisitos" value={resumen.total} />
        <StatCard label="Cumple" value={resumen.cumple} tone="emerald" />
        <StatCard label="Pendientes/Observados" value={resumen.pendientes} tone="amber" />
        <StatCard label="Vencidos" value={resumen.vencidos.length} tone="rose" />
      </section>

      {/* Alertas */}
      {(resumen.vencidos.length > 0 || resumen.porVencer.length > 0 || observaciones.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {resumen.vencidos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Vencidos</h2>
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                  {resumen.vencidos.length}
                </span>
              </div>
              <div className="space-y-2">
                {resumen.vencidos.slice(0, 5).map((r) => (
                  <AlertItem key={r.id} requisito_eleam={r} kind="vencido" />
                ))}
              </div>
            </div>
          )}

          {resumen.porVencer.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Por vencer (30 días)</h2>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                  {resumen.porVencer.length}
                </span>
              </div>
              <div className="space-y-2">
                {resumen.porVencer.slice(0, 5).map((r) => (
                  <AlertItem key={r.id} requisito_eleam={r} kind="por_vencer" />
                ))}
              </div>
            </div>
          )}

          {observaciones.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Observaciones abiertas</h2>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  {observaciones.length}
                </span>
              </div>
              <div className="space-y-2">
                {observaciones.slice(0, 5).map((o) => (
                  <ObservacionItem key={o.id} obs={o} />
                ))}
                {observaciones.length > 5 && (
                  <button
                    onClick={() => navigate("/accreditation/observaciones")}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Ver todas →
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Ámbitos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Ámbitos</h2>
          {isAdminEleam && (
            <button
              onClick={() => navigate("/accreditation/observaciones?nuevo=1")}
              className="text-sm text-[var(--color-primary)] hover:underline font-semibold"
            >
              + Registrar observación
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumen.ambitos.map((a) => (
            <AmbitoCard
              key={a.codigo}
              ambito={a}
              onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
            />
          ))}
        </div>
      </section>

      {/* Leyenda */}
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Leyenda de estados</p>
        <div className="flex flex-wrap gap-2">
          {["cumple", "pendiente", "observado", "vencido", "no_cumple", "no_aplica"].map((estado) => {
            const m = estadoMeta(estado);
            return (
              <span key={estado} className={`text-xs font-semibold rounded-full px-3 py-1 border ${m.cls}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${m.dot}`} />
                {m.label}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
