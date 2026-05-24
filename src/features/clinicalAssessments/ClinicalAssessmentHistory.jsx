import Modal from "../../components/Modal";
import { formatDateOnly } from "../../utils/dateUtils";
import { ASSESSMENT_LABEL, MOTIVO_LABEL } from "./clinicalAssessmentRules";

export default function ClinicalAssessmentHistory({ isOpen, onClose, tipo, items = [] }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial · ${ASSESSMENT_LABEL[tipo]}`}
      panelClassName="max-w-xl p-4 sm:p-6"
      closeOnBackdrop
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay evaluaciones previas registradas.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {tipo === "barthel"
                      ? <>{item.puntaje}<span className="text-xs text-slate-400">/100</span> · {item.resultado}</>
                      : item.resultado}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateOnly(item.fecha_evaluacion)} · {MOTIVO_LABEL[item.motivo] ?? item.motivo}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Próxima: {formatDateOnly(item.proxima_evaluacion)}
                </span>
              </div>
              {item.observaciones && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                  {item.observaciones}
                </p>
              )}
              {item.evaluador?.nombre && (
                <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                  Evaluó: {item.evaluador.nombre}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
