import React, { useState } from "react";
import { useToast } from "../../../components/Toast";
import { formatDateTime } from "../utils/superadminFormatters";
import { friendlyError } from "../../../utils/errorMessages";

const TIPOS = [
  { key: "nota",    label: "Nota" },
  { key: "llamada", label: "Llamada" },
  { key: "correo",  label: "Correo" },
  { key: "reunion", label: "Reunión" },
  { key: "demo",    label: "Demo" },
  { key: "soporte", label: "Soporte" },
  { key: "otro",    label: "Otro" },
];
const CANALES = [
  { key: "telefono",     label: "Teléfono" },
  { key: "email",        label: "Email" },
  { key: "whatsapp",     label: "WhatsApp" },
  { key: "presencial",   label: "Presencial" },
  { key: "videollamada", label: "Videollamada" },
  { key: "otro",         label: "Otro" },
];
const RESULTADOS = [
  { key: "positivo",      label: "Positivo",      cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { key: "neutro",        label: "Neutro",         cls: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  { key: "negativo",      label: "Negativo",       cls: "bg-rose-100 text-rose-700",      dot: "bg-rose-500" },
  { key: "sin_respuesta", label: "Sin respuesta",  cls: "bg-amber-100 text-amber-800",    dot: "bg-amber-500" },
];

// Inline icons for interaction type
function TipoIcon({ tipo }) {
  const props = { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor" };
  switch (tipo) {
    case "llamada":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
    case "correo":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
    case "reunion":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
    case "demo":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>;
    default:
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
  }
}

const empty = { tipo: "nota", canal: "", resumen: "", resultado: "", proxima_accion: "" };

export default function InteractionTimeline({ eleamId, interactions = [], onCreate }) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.resumen.trim()) { toast("Escribe un resumen.", "error"); return; }
    setBusy(true);
    try {
      await onCreate({
        eleam_id:       eleamId,
        tipo:           form.tipo,
        canal:          form.canal || null,
        resumen:        form.resumen,
        resultado:      form.resultado || null,
        proxima_accion: form.proxima_accion || null,
      });
      toast("Interacción registrada.", "success");
      setForm(empty);
      setCreating(false);
    } catch (err) {
      toast(friendlyError(err, "No se pudo registrar la interacción. Intenta de nuevo."), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Historial de interacciones</h3>
        <button
          type="button"
          onClick={() => setCreating((s) => !s)}
          className={`text-xs px-3 py-1.5 rounded-xl transition-colors ${
            creating
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-teal-700 text-white hover:bg-teal-800"
          }`}
        >
          {creating ? "Cancelar" : "+ Registrar contacto"}
        </button>
      </div>

      {creating && (
        <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={form.tipo}
              onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {TIPOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select
              value={form.canal}
              onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
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
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={form.resultado}
              onChange={(e) => setForm((p) => ({ ...p, resultado: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Resultado (opcional)</option>
              {RESULTADOS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="Próxima acción (opcional)"
              value={form.proxima_accion}
              onChange={(e) => setForm((p) => ({ ...p, proxima_accion: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setCreating(false); setForm(empty); }} className="text-sm text-slate-500 hover:underline px-2">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-teal-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {interactions.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center">Sin interacciones registradas todavía.</div>
      ) : (
        <ol className="relative ml-3 space-y-3">
          {/* Vertical line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-100" />

          {interactions.map((i) => {
            const res = RESULTADOS.find((r) => r.key === i.resultado);
            return (
              <li key={i.id} className="relative pl-5">
                {/* Timeline dot — colored by result */}
                <span className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${res?.dot ?? "bg-slate-300"}`} />

                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {/* Type icon + label */}
                    <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      <TipoIcon tipo={i.tipo} />
                      <span className="text-[10px] font-bold uppercase">{i.tipo}</span>
                    </div>
                    {i.canal && (
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md capitalize">{i.canal}</span>
                    )}
                    {res && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${res.cls}`}>
                        {res.label}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400 whitespace-nowrap">{formatDateTime(i.creado_en)}</span>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-slate-800 whitespace-pre-line leading-snug">{i.resumen}</p>

                  {/* Next action */}
                  {i.proxima_accion && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-800">
                        <strong className="font-semibold">Próxima acción:</strong> {i.proxima_accion}
                      </p>
                    </div>
                  )}

                  {/* Author */}
                  {i.autor?.nombre && (
                    <p className="text-[11px] text-slate-400 mt-1.5">registrado por {i.autor.nombre}</p>
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
