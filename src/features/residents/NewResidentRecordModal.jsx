import Modal from "../../components/Modal";

const OPTIONS = [
  {
    id: "vitals",
    title: "Signos vitales",
    description: "Registra mediciones y alertas clínicas.",
  },
  {
    id: "evolution",
    title: "Evolución",
    description: "Describe cambios, acciones y seguimiento.",
  },
  {
    id: "health-control",
    title: "Control o derivación",
    description: "Registra una atención, urgencia o próxima cita.",
  },
];

function RecordIcon({ type }) {
  if (type === "vitals") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "evolution") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M7 4h7l3 3v4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m13 17 5.5-5.5 2 2L15 19l-3 1 1-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function NewResidentRecordModal({ open, onClose, permissions, onSelect }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Nuevo registro" panelClassName="max-w-xl p-4 sm:p-6" closeOnBackdrop>
      <p className="-mt-2 mb-4 text-sm leading-6 text-slate-600">Selecciona qué necesitas registrar para este residente.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const enabled = permissions?.[option.id] !== false;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(option.id)}
              className="group min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700 group-hover:bg-white"><RecordIcon type={option.id} /></span>
              <span className="mt-3 block text-sm font-semibold text-slate-950">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{enabled ? option.description : "No tienes permiso para este registro."}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
