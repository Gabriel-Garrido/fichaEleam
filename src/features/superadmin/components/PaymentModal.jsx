import React, { useState } from "react";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { friendlyError } from "../../../utils/errorMessages";

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
const labelCls = "block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1";

const empty = { eleam_id: "", monto: "", plan: "mensual", metodo_pago: "", notas: "" };

export default function PaymentModal({ isOpen, onClose, eleams, defaultEleamId = "", onRegister }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...empty, eleam_id: defaultEleamId });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) setForm({ ...empty, eleam_id: defaultEleamId });
  }, [isOpen, defaultEleamId]);

  const set = (patch) => setForm((p) => ({ ...p, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.eleam_id || !form.monto) {
      toast("ELEAM y monto son obligatorios.", "error");
      return;
    }
    const monto = parseInt(form.monto, 10);
    if (!monto || monto <= 0) {
      toast("Monto inválido.", "error");
      return;
    }
    setSaving(true);
    try {
      await onRegister({
        eleam_id:    form.eleam_id,
        monto,
        plan:        form.plan,
        metodo_pago: form.metodo_pago || null,
        notas:       form.notas || null,
      });
      toast("Pago registrado y ELEAM activado.", "success");
      onClose();
    } catch (err) {
      toast(friendlyError(err, "No se pudo registrar el pago. Verifica los datos e intenta de nuevo."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago manual">
      <form onSubmit={submit} className="space-y-3">

        {/* Info box */}
        <div className="flex items-start gap-2.5 rounded-xl bg-teal-50 border border-teal-200 px-3.5 py-3">
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-xs text-teal-800">
            Esto activa la suscripción del ELEAM y registra una interacción CRM automáticamente. La fecha de vencimiento se calcula según el plan (30 días mensual, 365 anual).
          </p>
        </div>

        <div>
          <label htmlFor="pay-eleam" className={labelCls}>ELEAM *</label>
          <select
            id="pay-eleam"
            value={form.eleam_id}
            onChange={(e) => set({ eleam_id: e.target.value })}
            required
            className={inputCls}
          >
            <option value="">Seleccionar ELEAM…</option>
            {eleams.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pay-monto" className={labelCls}>Monto CLP *</label>
            <input
              id="pay-monto"
              type="number"
              min="1"
              value={form.monto}
              onChange={(e) => set({ monto: e.target.value })}
              required
              placeholder="50000"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="pay-plan" className={labelCls}>Plan *</label>
            <select
              id="pay-plan"
              value={form.plan}
              onChange={(e) => set({ plan: e.target.value })}
              className={inputCls}
            >
              <option value="mensual">Mensual (30 días)</option>
              <option value="anual">Anual (365 días)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="pay-metodo" className={labelCls}>Método de pago</label>
          <input
            id="pay-metodo"
            type="text"
            value={form.metodo_pago}
            onChange={(e) => set({ metodo_pago: e.target.value })}
            placeholder="Transferencia, tarjeta, efectivo…"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="pay-notas" className={labelCls}>Notas</label>
          <textarea
            id="pay-notas"
            value={form.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            placeholder="Observaciones sobre el pago…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="flex gap-3 justify-end pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Registrando…" : "Registrar y activar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
