import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import HelpTooltip from "../../components/HelpTooltip";
import {
  getRequisitosEleam,
  getObservaciones,
  buildResumen,
  estadoMeta,
  formatDate,
  diasHasta,
} from "./accreditationService";

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

function AccreditationNextStep({ resumen, observaciones, navigate }) {
  const step = resumen.vencidos.length > 0
    ? {
        tone: "rose",
        title: "Renueva documentos vencidos",
        text: `${resumen.vencidos.length} requisito${resumen.vencidos.length === 1 ? "" : "s"} vencido${resumen.vencidos.length === 1 ? "" : "s"}. Priorízalos antes de generar la carpeta.`,
        action: "Ver vencidos",
        path: "/accreditation",
      }
    : resumen.porVencer.length > 0
      ? {
          tone: "amber",
          title: "Planifica vencimientos próximos",
          text: `${resumen.porVencer.length} documento${resumen.porVencer.length === 1 ? "" : "s"} vence${resumen.porVencer.length === 1 ? "" : "n"} durante los próximos 30 días.`,
          action: "Revisar fechas",
          path: "/accreditation",
        }
      : observaciones.length > 0
        ? {
            tone: "amber",
            title: "Cierra observaciones abiertas",
            text: `${observaciones.length} observación${observaciones.length === 1 ? "" : "es"} pendiente${observaciones.length === 1 ? "" : "s"} de subsanación.`,
            action: "Ver observaciones",
            path: "/accreditation/observaciones",
          }
        : {
            tone: "emerald",
            title: "Carpeta ordenada",
            text: "No hay vencimientos urgentes ni observaciones abiertas. Mantén la carpeta descargable actualizada.",
            action: "Generar carpeta",
            path: "/accreditation/carpeta",
          };

  const toneClass = {
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  }[step.tone];

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold opacity-70">Siguiente paso recomendado</p>
          <h2 className="text-lg font-bold mt-1">{step.title}</h2>
          <p className="text-sm mt-1 opacity-90">{step.text}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(step.path)}
          className="w-full sm:w-auto rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
        >
          {step.action}
        </button>
      </div>
    </section>
  );
}

function ComplianceOverview({ resumen, observacionesCount, tone, navigate }) {
  const pendienteTotal = resumen.pendientes;
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Avance de acreditación</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-5xl font-black text-[var(--color-primary)] tabular-nums">{resumen.porcentaje}%</p>
            <p className="pb-2 text-sm text-gray-500">
              {resumen.cumple} de {resumen.total - resumen.noAplica} requisitos al día
            </p>
          </div>
          <div className="mt-4">
            <Bar pct={resumen.porcentaje} tone={tone} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => navigate("/accreditation")}
            className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-left"
          >
            <p className="text-2xl font-black text-amber-700 tabular-nums">{pendienteTotal}</p>
            <p className="text-[11px] font-semibold text-amber-800">Pendientes</p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/accreditation")}
            className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-left"
          >
            <p className="text-2xl font-black text-rose-700 tabular-nums">{resumen.vencidos.length}</p>
            <p className="text-[11px] font-semibold text-rose-800">Vencidos</p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/accreditation/observaciones")}
            className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 text-left"
          >
            <p className="text-2xl font-black text-orange-700 tabular-nums">{observacionesCount}</p>
            <p className="text-[11px] font-semibold text-orange-800">Observ.</p>
          </button>
        </div>
      </div>
    </section>
  );
}

function ambitoPriorityScore(ambito) {
  return (
    (ambito.vencido ?? 0) * 100 +
    (ambito.observado ?? 0) * 40 +
    (ambito.no_cumple ?? 0) * 35 +
    (ambito.pendiente ?? 0) * 10 +
    Math.max(0, 100 - (ambito.porcentaje ?? 0))
  );
}

export default function AccreditationDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, isAdminEleam, profile } = useAuth();
  const [requisitos, setRequisitos] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // La carpeta es por ELEAM. Si el usuario no tiene uno (típico del
  // superadmin sin ELEAM), no tiene sentido cargar datos: mostramos un
  // mensaje claro en lugar de un dashboard vacío.
  const sinEleam = !profile?.eleam_id;

  useEffect(() => {
    if (sinEleam) { setLoading(false); return; }
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
  }, [toast, sinEleam]);

  const resumen = useMemo(() => buildResumen(requisitos), [requisitos]);
  const priorityAmbitos = useMemo(() => {
    return [...(resumen.ambitos ?? [])]
      .map((a) => ({ ...a, priorityScore: ambitoPriorityScore(a) }))
      .filter((a) => a.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore || a.codigo.localeCompare(b.codigo))
      .slice(0, 4);
  }, [resumen.ambitos]);

  if (loading) return <Loading message="Cargando carpeta SEREMI..." />;

  if (sinEleam) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Carpeta SEREMI</h1>
        <p className="text-gray-500">
          Esta vista funciona dentro del contexto de un ELEAM. Tu cuenta no
          tiene uno asociado.
        </p>
      </div>
    );
  }

  const cumplimientoTone = resumen.porcentaje >= 80 ? "emerald" : resumen.porcentaje >= 50 ? "amber" : "rose";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[var(--color-primary)] inline-flex items-center gap-2">
            Carpeta SEREMI
            <HelpTooltip label="Ayuda sobre carpeta SEREMI">
              Revisa primero vencidos y observaciones. Después completa cada ámbito y genera la carpeta cuando todo esté listo para fiscalización.
            </HelpTooltip>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Prioriza vencidos, observaciones y requisitos pendientes.
            {eleam?.nombre ? <> · <span className="font-semibold">{eleam.nombre}</span></> : null}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:flex gap-2 w-full sm:w-auto">
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

      <AccreditationNextStep resumen={resumen} observaciones={observaciones} navigate={navigate} />

      <ComplianceOverview
        resumen={resumen}
        observacionesCount={observaciones.length}
        tone={cumplimientoTone}
        navigate={navigate}
      />

      {/* Alertas */}
      {(resumen.vencidos.length > 0 || resumen.porVencer.length > 0 || observaciones.length > 0) && (
        <details className="group bg-white rounded-2xl border border-gray-100 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Alertas de carpeta</h2>
              <p className="text-xs text-gray-500">
                {resumen.vencidos.length} vencidos · {resumen.porVencer.length} por vencer · {observaciones.length} observaciones
              </p>
            </div>
            <span className="text-xs font-semibold text-[var(--color-primary)] group-open:hidden">Ver detalle</span>
            <span className="hidden text-xs font-semibold text-gray-500 group-open:inline">Ocultar</span>
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-gray-100 p-4 sm:p-5">
            {resumen.vencidos.length > 0 && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
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
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-800">Por vencer</h2>
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
              <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-800">Observaciones</h2>
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
          </div>
        </details>
      )}

      {/* Ámbitos */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
            Ámbitos prioritarios
            <HelpTooltip label="Ayuda sobre ámbitos SEREMI">
              Se muestran primero los ámbitos con vencidos, observados, no cumple o más pendientes. El listado completo queda debajo.
            </HelpTooltip>
          </h2>
          {isAdminEleam && (
            <button
              onClick={() => navigate("/accreditation/observaciones?nuevo=1")}
              className="text-sm text-[var(--color-primary)] hover:underline font-semibold"
            >
              + Registrar observación
            </button>
          )}
        </div>
        {priorityAmbitos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {priorityAmbitos.map((a) => (
              <AmbitoCard
                key={a.codigo}
                ambito={a}
                onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            No hay ámbitos con alertas. Mantén la carpeta al día revisando vencimientos próximos.
          </div>
        )}
      </section>

      <details className="group rounded-2xl border border-gray-100 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Todos los ámbitos</h2>
            <p className="text-xs text-gray-500">{resumen.ambitos.length} secciones SEREMI ordenadas por código.</p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-primary)] group-open:hidden">Ver listado</span>
          <span className="hidden text-xs font-semibold text-gray-500 group-open:inline">Ocultar</span>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-100 p-4 sm:p-5">
          {resumen.ambitos.map((a) => (
            <AmbitoCard
              key={a.codigo}
              ambito={a}
              onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
            />
          ))}
        </div>
      </details>

      {/* Leyenda */}
      <details className="group bg-slate-50 border border-slate-200 rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Leyenda de estados</p>
          <span className="text-xs text-slate-500 group-open:hidden">Ver</span>
          <span className="hidden text-xs text-slate-500 group-open:inline">Ocultar</span>
        </summary>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
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
      </details>
    </div>
  );
}
