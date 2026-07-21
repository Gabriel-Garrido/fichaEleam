import { useState } from "react";
import HelpTooltip from "../../components/HelpTooltip";
import { formatDateOnly } from "../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import {
  ASSESSMENT_HELP,
  ASSESSMENT_LABEL,
  ASSESSMENT_SHORT_LABEL,
  MOTIVO_LABEL,
  computeTinetti,
  evaluationStatus,
} from "./clinicalAssessmentRules";
import ClinicalAssessmentModal from "./ClinicalAssessmentModal";
import ClinicalAssessmentHistory from "./ClinicalAssessmentHistory";

const TONE_STYLES = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:   "bg-amber-50 text-amber-800 border-amber-200",
  rose:    "bg-rose-50 text-rose-700 border-rose-200",
  slate:   "bg-slate-50 text-slate-600 border-slate-200",
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_STYLES[status.tone]}`}>
      {status.label}
    </span>
  );
}

function ScoreDisplay({ tipo, assessment }) {
  if (!assessment) {
    return (
      <p className="text-sm text-slate-500">Aún no registras una evaluación.</p>
    );
  }
  if (tipo === "barthel") {
    return (
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {assessment.puntaje}<span className="text-sm font-medium text-slate-400">/100</span>
        </p>
        <p className="text-sm text-slate-600">{assessment.resultado}</p>
      </div>
    );
  }
  if (tipo === "mna") {
    const display = assessment.detalle?._puntaje_decimal ?? assessment.puntaje;
    return (
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {display}<span className="text-sm font-medium text-slate-400">/30</span>
        </p>
        <p className="text-sm text-slate-600">{assessment.resultado}</p>
      </div>
    );
  }
  if (tipo === "mmse") {
    return (
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {assessment.puntaje}<span className="text-sm font-medium text-slate-400">/30</span>
        </p>
        <p className="text-sm text-slate-600">{assessment.resultado}</p>
      </div>
    );
  }
  if (tipo === "tinetti") {
    const sub = computeTinetti(assessment.detalle ?? {});
    const puntaje = assessment.puntaje ?? sub.puntaje;
    const tono = puntaje >= 25 ? "emerald" : puntaje >= 19 ? "amber" : "rose";
    return (
      <div>
        <div className="flex items-end gap-2">
          <p className={`text-2xl font-semibold tabular-nums ${tono === "emerald" ? "text-emerald-700" : tono === "amber" ? "text-amber-700" : "text-rose-700"}`}>
            {puntaje}<span className="text-sm font-medium text-slate-400">/28</span>
          </p>
          <span className="text-xs text-slate-500 pb-1">Eq: {sub.equilibrio}/16 · Mar: {sub.marcha}/12</span>
        </div>
        <p className="text-sm text-slate-600">{assessment.resultado || sub.resultado}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-2xl font-semibold text-slate-900">{assessment.resultado}</p>
      <p className="text-sm text-slate-600">{assessment.puntaje} de 6 funciones independientes</p>
    </div>
  );
}

export default function ClinicalAssessmentBadge({ tipo, resident, latest, history = [], onChanged }) {
  const { can } = useAuth();
  const canApply = can("aplicar_evaluaciones_clinicas");
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const status = evaluationStatus(latest?.proxima_evaluacion);
  const lastDate = latest?.fecha_evaluacion;
  const motivoLabel = MOTIVO_LABEL[latest?.motivo] ?? "";

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
              {ASSESSMENT_SHORT_LABEL[tipo]}
            </p>
            <HelpTooltip label={`Ayuda: ${ASSESSMENT_LABEL[tipo]}`}>
              {ASSESSMENT_HELP[tipo]}
            </HelpTooltip>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{ASSESSMENT_LABEL[tipo]}</h3>
        </div>
        <StatusPill status={status} />
      </header>

      <div className="mt-3">
        <ScoreDisplay tipo={tipo} assessment={latest} />
      </div>

      {latest && (
        <p className="mt-2 text-xs text-slate-500">
          Última evaluación: {formatDateOnly(lastDate)}{motivoLabel ? ` · ${motivoLabel}` : ""}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canApply && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {latest ? "Reevaluar" : "Aplicar primera evaluación"}
          </button>
        )}
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver historial ({history.length})
          </button>
        )}
      </div>

      <ClinicalAssessmentModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        resident={resident}
        tipo={tipo}
        onSuccess={(saved) => onChanged?.(saved)}
      />
      <ClinicalAssessmentHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        tipo={tipo}
        items={history}
      />
    </section>
  );
}
