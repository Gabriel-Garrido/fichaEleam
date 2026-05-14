import React, { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { CRM_STATES, RIESGO_CHURN } from "../utils/superadminFormatters";
import { friendlyError } from "../../../utils/errorMessages";

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
const labelCls = "block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1";

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

function FieldGroup({ title, children, cols = 2 }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{title}</p>
      <div className={`grid gap-3 ${cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
        {children}
      </div>
    </div>
  );
}

export default function EleamEditModal({ eleam, onClose, onSave }) {
  const toast = useToast();
  const [form, setForm]     = useState(() => (eleam ? initialFromEleam(eleam) : {}));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eleam) setForm(initialFromEleam(eleam));
  }, [eleam]);

  if (!eleam) return null;

  const set = (patch) => setForm((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_residentes:                form.max_residentes !== "" ? parseInt(form.max_residentes, 10) : null,
        fecha_vencimiento_suscripcion: form.fecha_vencimiento_suscripcion || null,
        proxima_accion_fecha:          form.proxima_accion_fecha || null,
        origen_lead:                   form.origen_lead?.trim() || null,
        notas_admin:                   form.notas_admin?.trim() || null,
      };
      await onSave(eleam.id, payload);
      toast("ELEAM actualizado.", "success");
      onClose();
    } catch (e) {
      toast(friendlyError(e, "No se pudo actualizar el ELEAM. Verifica los datos e intenta de nuevo."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Editar ELEAM: ${eleam.nombre}`}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 -mr-1">

        {/* Suscripción */}
        <FieldGroup title="Suscripción y plan" cols={2}>
          <label htmlFor="edit-plan" className="flex flex-col gap-1">
            <span className={labelCls}>Plan</span>
            <select
              id="edit-plan"
              value={form.plan ?? "demo"}
              onChange={(e) => set({ plan: e.target.value })}
              className={inputCls}
            >
              <option value="demo">Demo</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className={labelCls}>Acceso</span>
            <label htmlFor="edit-pago-activo" className="flex items-center gap-2.5 h-[38px] cursor-pointer">
              <input
                id="edit-pago-activo"
                type="checkbox"
                checked={form.pago_activo ?? false}
                onChange={(e) => set({ pago_activo: e.target.checked })}
                className="w-4 h-4 accent-teal-600 rounded"
              />
              <span className="text-sm text-slate-700 font-medium">Suscripción activa</span>
            </label>
          </div>

          <label htmlFor="edit-vencimiento" className="flex flex-col gap-1">
            <span className={labelCls}>Vencimiento suscripción</span>
            <input
              id="edit-vencimiento"
              type="date"
              value={form.fecha_vencimiento_suscripcion}
              onChange={(e) => set({ fecha_vencimiento_suscripcion: e.target.value })}
              className={inputCls}
            />
          </label>

          <label htmlFor="edit-max-res" className="flex flex-col gap-1">
            <span className={labelCls}>
              Máx. residentes <span className="font-normal normal-case text-slate-300">(vacío = ilimitado)</span>
            </span>
            <input
              id="edit-max-res"
              type="number"
              min="1"
              value={form.max_residentes}
              onChange={(e) => set({ max_residentes: e.target.value })}
              placeholder="Ej: 30"
              className={inputCls}
            />
          </label>
        </FieldGroup>

        {/* CRM */}
        <FieldGroup title="CRM comercial" cols={2}>
          <label htmlFor="edit-crm" className="flex flex-col gap-1">
            <span className={labelCls}>Estado CRM</span>
            <select
              id="edit-crm"
              value={form.crm_estado}
              onChange={(e) => set({ crm_estado: e.target.value })}
              className={inputCls}
            >
              {CRM_STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>

          <label htmlFor="edit-riesgo" className="flex flex-col gap-1">
            <span className={labelCls}>Riesgo churn</span>
            <select
              id="edit-riesgo"
              value={form.riesgo_churn}
              onChange={(e) => set({ riesgo_churn: e.target.value })}
              className={inputCls}
            >
              {RIESGO_CHURN.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>

          <label htmlFor="edit-origen" className="flex flex-col gap-1">
            <span className={labelCls}>Origen lead</span>
            <input
              id="edit-origen"
              type="text"
              value={form.origen_lead}
              onChange={(e) => set({ origen_lead: e.target.value })}
              placeholder="Web, referido, evento…"
              className={inputCls}
            />
          </label>

          <label htmlFor="edit-proxima" className="flex flex-col gap-1">
            <span className={labelCls}>Próxima acción</span>
            <input
              id="edit-proxima"
              type="date"
              value={form.proxima_accion_fecha}
              onChange={(e) => set({ proxima_accion_fecha: e.target.value })}
              className={inputCls}
            />
          </label>
        </FieldGroup>

        {/* Notas */}
        <div>
          <label htmlFor="edit-notas" className={labelCls}>Notas internas</label>
          <textarea
            id="edit-notas"
            value={form.notas_admin}
            onChange={(e) => set({ notas_admin: e.target.value })}
            rows={3}
            placeholder="Notas visibles solo para superadmin…"
            className={`${inputCls} resize-none`}
          />
          <p className="text-[11px] text-slate-400 mt-1">Solo visible para superadmin, no se muestra al ELEAM.</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}
