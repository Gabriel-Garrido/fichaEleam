import Modal from "../../../components/Modal";

export default function DemoActiveReminderModal({ eleam, preview, loading, sending, error, onClose, onConfirm }) {
  return (
    <Modal isOpen={Boolean(eleam)} onClose={sending ? undefined : onClose} title="Vista previa del recordatorio" panelClassName="max-w-2xl p-4 sm:p-6">
      {loading ? (
        <div className="grid min-h-64 place-items-center text-sm text-slate-500">Preparando correo…</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : preview ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p><span className="font-semibold text-slate-500">Para:</span> <span className="break-all text-slate-900">{preview.to}</span></p>
            <p className="mt-1"><span className="font-semibold text-slate-500">Asunto:</span> <span className="text-slate-900">{preview.subject}</span></p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
            <div className="bg-teal-700 px-5 py-5 text-white"><p className="text-[11px] font-bold tracking-widest text-teal-200">FICHAELEAM</p><h3 className="mt-1 text-xl font-black">{preview.heading}</h3></div>
            <div className="p-5"><p className="mb-3 text-sm font-bold text-slate-900">{preview.greeting}</p><p className="text-sm leading-6 text-slate-600">{preview.body}</p><div className="mt-5 rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-black text-white">{preview.cta}</div><p className="mt-4 text-xs leading-5 text-slate-500">{preview.accessHint}</p></div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">Este correo solo recuerda la vigencia del demo de <strong>{eleam.nombre}</strong>. No cambia su fecha de vencimiento ni su información.</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={sending} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={sending} onClick={onConfirm} className="min-h-11 rounded-xl bg-teal-700 px-5 py-2 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60">{sending ? "Enviando…" : "Enviar recordatorio"}</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
