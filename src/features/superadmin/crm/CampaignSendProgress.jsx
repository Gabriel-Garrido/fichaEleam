import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../components/Toast";
import { userFacingFormError } from "../../../utils/formValidation";
import { SEND_BATCH_MAX, sendCampaignBatch } from "../crmEmailService";

/**
 * Procesa la lista de prospectos en lotes secuenciales de hasta 50.
 * Llama a la Edge Function `send-crm-email-campaign` por cada lote y
 * acumula resultados. Notifica al padre cuando termina.
 *
 * Por qué chunks pequeños:
 *  - Edge Function tiene timeout ~150s; con 50 + sleep es ~25s.
 *  - Si el navegador del operador se cierra, los lotes ya completados
 *    están persistidos en `crm_email_sends`.
 */
export default function CampaignSendProgress({ campaignId, prospectIds, onDone }) {
  const toast = useToast();
  const [done, setDone] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const startedRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const batches = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < prospectIds.length; i += SEND_BATCH_MAX) {
      chunks.push(prospectIds.slice(i, i + SEND_BATCH_MAX));
    }
    return chunks;
  }, [prospectIds]);

  useEffect(() => {
    if (startedRef.current) return;
    if (!campaignId || prospectIds.length === 0) return;
    startedRef.current = true;
    let cancelled = false;
    let accumulatedResults = [];
    let processed = 0;
    let aggregateSent = 0;
    let aggregateFailed = 0;
    let aggregateSkipped = 0;

    (async () => {
      for (const batch of batches) {
        if (cancelled) break;
        try {
          const response = await sendCampaignBatch(campaignId, batch);
          accumulatedResults = accumulatedResults.concat(response.results ?? []);
          aggregateSent += response.sent ?? 0;
          aggregateFailed += response.failed ?? 0;
          aggregateSkipped += response.skipped ?? 0;
          processed += batch.length;
          if (!cancelled) {
            setDone(processed);
            setResults(accumulatedResults.slice());
          }
        } catch (err) {
          if (!cancelled) {
            const message = userFacingFormError(err, "Error al enviar el lote.");
            setError(message);
            toast(message, "error");
          }
          break;
        }
      }
      if (!cancelled) {
        setFinished(true);
        onDoneRef.current?.({
          sent: aggregateSent,
          failed: aggregateFailed,
          skipped: aggregateSkipped,
          results: accumulatedResults,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [campaignId, prospectIds, batches, toast]);

  const total = prospectIds.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const sentCount = results.filter((r) => r.status === "enviado").length;
  const failedCount = results.filter((r) => r.status === "fallido").length;
  const skippedCount = results.filter((r) => r.status === "omitido").length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-700">{finished ? "Envío completado" : "Enviando…"}</span>
          <span className="tabular-nums text-slate-500">{done}/{total} ({pct}%)</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${error ? "bg-rose-500" : finished ? "bg-emerald-500" : "bg-teal-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Enviados</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Fallidos</p>
          <p className="text-xl font-bold tabular-nums text-rose-700">{failedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Omitidos</p>
          <p className="text-xl font-bold tabular-nums text-slate-500">{skippedCount}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-semibold">El envío se detuvo</p>
          <p className="mt-1 text-xs">{error}</p>
          <p className="mt-2 text-xs">Los destinatarios procesados antes del error quedan registrados. Puedes reintentar la campaña desde "Ver detalle".</p>
        </div>
      )}

      {finished && !error && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">¡Listo!</p>
          <p className="mt-1 text-xs">Revisa el detalle de la campaña para ver el resultado por destinatario.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-1.5">Destinatario</th>
                <th className="px-3 py-1.5">Estado</th>
                <th className="px-3 py-1.5">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => (
                <tr key={r.prospect_id}>
                  <td className="px-3 py-1.5 text-slate-700">{r.email || "—"}</td>
                  <td className={`px-3 py-1.5 font-semibold ${
                    r.status === "enviado" ? "text-emerald-700"
                    : r.status === "fallido" ? "text-rose-700"
                    : "text-slate-500"
                  }`}>{r.status}</td>
                  <td className="max-w-xs px-3 py-1.5 text-[11px] text-slate-500 truncate" title={r.error || r.resend_id || ""}>
                    {r.error || r.resend_id || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
