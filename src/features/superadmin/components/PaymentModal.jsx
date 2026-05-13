import React, { useState } from "react";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { friendlyError } from "../../../utils/errorMessages";

const empty = { eleam_id: "", monto: "", plan: "mensual", metodo_pago: "", notas: "" };

export default function PaymentModal({ isOpen, onClose, eleams, defaultEleamId = "", onRegister }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...empty, eleam_id: defaultEleamId });
  const [saving, setSaving] = useState(false);

  // Reset al abrir
  React.useEffect(() => {
    if (isOpen) setForm({ ...empty, eleam_id: defaultEleamId });
  }, [isOpen, defaultEleamId]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">ELEAM *</label>
          <select
            value={form.eleam_id}
            onChange={(e) => setForm((p) => ({ ...p, eleam_id: e.target.value }))}
            required
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="">Seleccionar ELEAM…</option>
            {eleams.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Monto CLP *</label>
            <input
              type="number" min="1"
              value={form.monto}
              onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
              required placeholder="50000"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Plan *</label>
            <select
              value={form.plan}
              onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Método de pago</label>
          <input
            type="text"
            value={form.metodo_pago}
            onChange={(e) => setForm((p) => ({ ...p, metodo_pago: e.target.value }))}
            placeholder="Transferencia, tarjeta, efectivo…"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <p className="text-[11px] text-slate-400 italic">
          El registro activa la suscripción y agrega una interacción CRM automática.
        </p>

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={saving}
            className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Registrando…" : "Registrar y activar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
