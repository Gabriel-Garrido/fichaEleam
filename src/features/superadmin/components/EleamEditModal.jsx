import React, { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { CRM_STATES, RIESGO_CHURN } from "../utils/superadminFormatters";

const initialFromEleam = (e) => ({
  pago_activo:                   e.pago_activo ?? false,
  plan:                          e.plan ?? "demo",
  crm_estado:                    e.crm_estado ?? "lead",
  riesgo_churn:                  e.riesgo_churn ?? "desconocido",
  origen_lead:                   e.origen_lead ?? "",
  proxima_accion_fecha:          e.proxima_accion_fecha ?? "",
  max_residentes:                e.max_residentes ?? "",
  fecha_vencimiento_suscripcion: e.fecha_vencimiento_suscripcion?.slice(0, 10) ?? "",
  notas_admin:                   e.notas_admin ?? "",
});

export default function EleamEditModal({ eleam, onClose, onSave }) {
  const toast = useToast();
  const [form, setForm]   = useState(() => (eleam ? initialFromEleam(eleam) : {}));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eleam) setForm(initialFromEleam(eleam));
  }, [eleam]);

  if (!eleam) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_residentes: form.max_residentes !== "" ? parseInt(form.max_residentes, 10) : null,
        fecha_vencimiento_suscripcion: form.fecha_vencimiento_suscripcion || null,
        proxima_accion_fecha: form.proxima_accion_fecha || null,
        origen_lead: form.origen_lead?.trim() || null,
        notas_admin: form.notas_admin?.trim() || null,
      };
      await onSave(eleam.id, payload);
      toast("ELEAM actualizado.", "success");
      onClose();
    } catch (e) {
      toast(e.message || "No se pudo actualizar el ELEAM.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Editar: ${eleam.nombre}`}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.pago_activo ?? false}
            onChange={(e) => setForm((p) => ({ ...p, pago_activo: e.target.checked }))}
            className="w-4 h-4 accent-slate-600"
          />
          <span className="text-sm font-medium text-gray-700">Suscripción activa</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Plan</label>
            <select
              value={form.plan ?? "demo"}
              onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="demo">Demo</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Estado CRM</label>
            <select
              value={form.crm_estado}
              onChange={(e) => setForm((p) => ({ ...p, crm_estado: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {CRM_STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Riesgo churn</label>
            <select
              value={form.riesgo_churn}
              onChange={(e) => setForm((p) => ({ ...p, riesgo_churn: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {RIESGO_CHURN.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Origen lead</label>
            <input
              type="text"
              value={form.origen_lead}
              onChange={(e) => setForm((p) => ({ ...p, origen_lead: e.target.value }))}
              placeholder="Web, referido, evento…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">
              Máx. residentes <span className="font-normal text-gray-400">(vacío = ilimitado)</span>
            </label>
            <input
              type="number" min="1"
              value={form.max_residentes}
              onChange={(e) => setForm((p) => ({ ...p, max_residentes: e.target.value }))}
              placeholder="Ej: 30"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Vencimiento suscripción</label>
            <input
              type="date"
              value={form.fecha_vencimiento_suscripcion}
              onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento_suscripcion: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Próxima acción</label>
            <input
              type="date"
              value={form.proxima_accion_fecha}
              onChange={(e) => setForm((p) => ({ ...p, proxima_accion_fecha: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-semibold text-gray-500 mb-1">Notas internas</label>
          <textarea
            value={form.notas_admin}
            onChange={(e) => setForm((p) => ({ ...p, notas_admin: e.target.value }))}
            rows={3}
            placeholder="Notas visibles solo para superadmin…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}
