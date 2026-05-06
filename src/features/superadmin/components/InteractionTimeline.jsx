import React, { useState } from "react";
import { useToast } from "../../../components/Toast";
import { formatDateTime } from "../utils/superadminFormatters";

const TIPOS = [
  { key: "nota",     label: "Nota" },
  { key: "llamada",  label: "Llamada" },
  { key: "correo",   label: "Correo" },
  { key: "reunion",  label: "Reunión" },
  { key: "demo",     label: "Demo" },
  { key: "soporte",  label: "Soporte" },
  { key: "otro",     label: "Otro" },
];
const CANALES = [
  { key: "telefono",      label: "Teléfono" },
  { key: "email",         label: "Email" },
  { key: "whatsapp",      label: "WhatsApp" },
  { key: "presencial",    label: "Presencial" },
  { key: "videollamada",  label: "Videollamada" },
  { key: "otro",          label: "Otro" },
];
const RESULTADOS = [
  { key: "positivo",      label: "Positivo",       cls: "bg-emerald-100 text-emerald-700" },
  { key: "neutro",        label: "Neutro",         cls: "bg-slate-100 text-slate-600" },
  { key: "negativo",      label: "Negativo",       cls: "bg-rose-100 text-rose-700" },
  { key: "sin_respuesta", label: "Sin respuesta",  cls: "bg-amber-100 text-amber-800" },
];

const empty = { tipo: "nota", canal: "", resumen: "", resultado: "", proxima_accion: "" };

export default function InteractionTimeline({ eleamId, interactions = [], onCreate }) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.resumen.trim()) {
      toast("Escribe un resumen.", "error");
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        eleam_id:        eleamId,
        tipo:            form.tipo,
        canal:           form.canal || null,
        resumen:         form.resumen,
        resultado:       form.resultado || null,
        proxima_accion:  form.proxima_accion || null,
      });
      toast("Interacción registrada.", "success");
      setForm(empty);
      setCreating(false);
    } catch (err) {
      toast(err.message || "Error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Historial de interacciones</h3>
        <button
          onClick={() => setCreating((s) => !s)}
          className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
        >
          {creating ? "Cerrar" : "+ Registrar contacto"}
        </button>
      </div>

      {creating && (
        <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={form.tipo}
              onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {TIPOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select
              value={form.canal}
              onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Canal (opcional)</option>
              {CANALES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <textarea
            rows={3}
            placeholder="¿Qué pasó? *"
            required
            value={form.resumen}
            onChange={(e) => setForm((p) => ({ ...p, resumen: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <select
            value={form.resultado}
            onChange={(e) => setForm((p) => ({ ...p, resultado: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Resultado (opcional)</option>
            {RESULTADOS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Próxima acción (opcional)"
            value={form.proxima_accion}
            onChange={(e) => setForm((p) => ({ ...p, proxima_accion: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setCreating(false); setForm(empty); }} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
            <button
              type="submit" disabled={busy}
              className="bg-slate-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {interactions.length === 0 ? (
        <div className="text-sm text-gray-400 py-6 text-center">Sin interacciones registradas todavía.</div>
      ) : (
        <ol className="relative border-l-2 border-gray-100 ml-2 space-y-3">
          {interactions.map((i) => {
            const res = RESULTADOS.find((r) => r.key === i.resultado);
            return (
              <li key={i.id} className="ml-4 pb-1">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-slate-400" />
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wide text-gray-500">{i.tipo}</span>
                    {i.canal && (
                      <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{i.canal}</span>
                    )}
                    {res && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${res.cls}`}>
                        {res.label}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">{formatDateTime(i.creado_en)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{i.resumen}</p>
                  {i.proxima_accion && (
                    <p className="text-xs text-slate-700 mt-1">
                      <strong>Próxima acción:</strong> {i.proxima_accion}
                    </p>
                  )}
                  {i.autor?.nombre && (
                    <p className="text-[11px] text-gray-400 mt-1">por {i.autor.nombre}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
