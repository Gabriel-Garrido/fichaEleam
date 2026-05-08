import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import {
  getAmbitoByCodigo,
  getRequisitosEleam,
  estadoMeta,
  formatDate,
  diasHasta,
} from "./accreditationService";

const FILTROS = [
  { key: "all",       label: "Todos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "cumple",    label: "Cumple" },
  { key: "observado", label: "Observados" },
  { key: "vencido",   label: "Vencidos" },
  { key: "no_aplica", label: "No aplica" },
];

function VencimientoChip({ fecha }) {
  if (!fecha) return null;
  const d = diasHasta(fecha);
  if (d == null) return null;
  let cls = "bg-emerald-100 text-emerald-700";
  let txt = `Vence ${formatDate(fecha)}`;
  if (d < 0)       { cls = "bg-rose-100 text-rose-700";   txt = `Venció hace ${Math.abs(d)}d`; }
  else if (d <= 30){ cls = "bg-amber-100 text-amber-800"; txt = `Vence en ${d}d`; }
  return <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`}>{txt}</span>;
}

function RequisitoRow({ re, onClick }) {
  const m = estadoMeta(re.estado);
  const r = re.requisito;
  const hasEvidence = (re.documentos ?? []).some((d) => d.vigente);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded">
              {r.codigo}
            </span>
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${m.cls}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${m.dot}`} />
              {m.label}
            </span>
            <VencimientoChip fecha={re.fecha_vencimiento} />
            {!hasEvidence && re.estado !== "no_aplica" && (
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">
                Sin evidencia
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 leading-tight">{r.nombre}</h3>
          {r.descripcion && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.descripcion}</p>
          )}
        </div>
        <svg className="shrink-0 w-5 h-5 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mt-2">
        {r.medio_verificador && (
          <span className="bg-gray-50 px-2 py-0.5 rounded">📎 {r.medio_verificador}</span>
        )}
        {re.responsable?.nombre && (
          <span>Responsable: <span className="font-medium text-gray-700">{re.responsable.nombre}</span></span>
        )}
        {re.no_aplica_motivo && (
          <span className="italic">No aplica: {re.no_aplica_motivo}</span>
        )}
      </div>
    </button>
  );
}

function requisitoPriorityScore(re) {
  const estadoScore = {
    vencido: 100,
    observado: 70,
    no_cumple: 65,
    pendiente: 40,
    cumple: 0,
    no_aplica: 0,
  }[re.estado] ?? 0;
  const d = diasHasta(re.fecha_vencimiento);
  const vencScore = d == null ? 0 : d < 0 ? 120 : d <= 30 ? 45 : 0;
  const evidenceScore = re.estado !== "no_aplica" && !(re.documentos ?? []).some((d) => d.vigente) ? 35 : 0;
  return estadoScore + vencScore + evidenceScore;
}

function FocusRequirement({ requisito, onOpen }) {
  if (!requisito) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Este ámbito no tiene pendientes críticos. Puedes revisar requisitos cumplidos o volver a la carpeta.
      </section>
    );
  }
  const r = requisito.requisito;
  const m = estadoMeta(requisito.estado);
  const hasEvidence = (requisito.documentos ?? []).some((d) => d.vigente);
  return (
    <section className="rounded-2xl border border-teal-100 bg-white shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">Siguiente requisito recomendado</p>
          <h2 className="text-base font-bold text-gray-900 mt-1 truncate">
            {r.codigo} · {r.nombre}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${m.cls}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${m.dot}`} />
              {m.label}
            </span>
            <VencimientoChip fecha={requisito.fecha_vencimiento} />
            {!hasEvidence && requisito.estado !== "no_aplica" && (
              <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">
                Sin evidencia
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="w-full sm:w-auto rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-button-hover)]"
        >
          Abrir requisito
        </button>
      </div>
    </section>
  );
}

export default function AccreditationAmbito() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [ambito, setAmbito] = useState(null);
  const [requisitos, setRequisitos] = useState([]);
  const [filtro, setFiltro] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getAmbitoByCodigo(codigo),
      getRequisitosEleam(),
    ])
      .then(([a, r]) => {
        if (!active) return;
        setAmbito(a);
        setRequisitos((r ?? []).filter((x) => x.requisito?.ambito?.codigo === codigo));
      })
      .catch((e) => active && toast(e.message || "Error", "error"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [codigo, toast]);

  const filtered = useMemo(() => {
    if (filtro === "all") return requisitos;
    return requisitos.filter((r) => r.estado === filtro);
  }, [requisitos, filtro]);

  const counts = useMemo(() => {
    const c = { all: requisitos.length };
    for (const r of requisitos) c[r.estado] = (c[r.estado] ?? 0) + 1;
    return c;
  }, [requisitos]);

  const nextRequisito = useMemo(() => {
    return [...requisitos]
      .map((r) => ({ ...r, priorityScore: requisitoPriorityScore(r) }))
      .filter((r) => r.priorityScore > 0)
      .sort((a, b) =>
        b.priorityScore - a.priorityScore ||
        (a.requisito?.orden ?? 0) - (b.requisito?.orden ?? 0)
      )[0] ?? null;
  }, [requisitos]);

  if (loading) return <Loading message="Cargando ámbito..." />;
  if (!ambito) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-2">Ámbito no encontrado</h1>
        <button
          onClick={() => navigate("/accreditation")}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Volver a la Carpeta SEREMI
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <button
        onClick={() => navigate("/accreditation")}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        ← Volver a la Carpeta SEREMI
      </button>

      <header className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-4xl">{ambito.icono ?? "📁"}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-teal-700 bg-teal-50 inline-block px-2 py-0.5 rounded mb-1">
              {ambito.codigo}
            </p>
            <h1 className="text-2xl font-black text-gray-800">{ambito.nombre}</h1>
            {ambito.descripcion && (
              <p className="text-sm text-gray-500 mt-1">{ambito.descripcion}</p>
            )}
          </div>
        </div>
      </header>

      <FocusRequirement
        requisito={nextRequisito}
        onOpen={() => navigate(`/accreditation/requisito/${nextRequisito.id}`)}
      />

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              filtro === f.key
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
            {counts[f.key] != null && (
              <span className={`ml-1.5 text-xs ${filtro === f.key ? "text-teal-100" : "text-gray-400"}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          No hay requisitos en este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => (a.requisito.orden ?? 0) - (b.requisito.orden ?? 0))
            .map((re) => (
              <RequisitoRow
                key={re.id}
                re={re}
                onClick={() => navigate(`/accreditation/requisito/${re.id}`)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
