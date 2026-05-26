import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import Button from "../../../components/Button";
import { useToast } from "../../../components/Toast";
import { userFacingFormError } from "../../../utils/formValidation";
import { formatDateTime } from "../../../utils/dateUtils";
import { getCampaignMembers, getCampaignSends, sendCampaignBatch, SEND_BATCH_MAX } from "../crmEmailService";
import { digitalizationLabel, stageLabel } from "./crmSalesPlaybook";

const ESTADO_TONE = {
  pendiente: "bg-slate-100 text-slate-700",
  enviado:   "bg-emerald-100 text-emerald-700",
  fallido:   "bg-rose-100 text-rose-700",
  omitido:   "bg-amber-100 text-amber-700",
  baja:      "bg-rose-100 text-rose-700",
};

const ESTADO_LABEL = {
  pendiente: "Pendiente",
  enviado:   "Enviado",
  fallido:   "Fallido",
  omitido:   "Omitido",
  baja:      "Baja",
};

export default function CampaignDetailModal({ isOpen, campaign, onClose, onChanged }) {
  const toast = useToast();
  const [sends, setSends] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!campaign?.id) return;
    setLoading(true);
    try {
      const [sendData, memberData] = await Promise.all([
        getCampaignSends(campaign.id),
        getCampaignMembers(campaign.id),
      ]);
      setSends(sendData);
      setMembers(memberData);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudieron cargar los envíos."), "error");
    } finally {
      setLoading(false);
    }
  }, [campaign?.id, toast]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const counts = useMemo(() => {
    return sends.reduce((acc, s) => {
      acc[s.estado] = (acc[s.estado] ?? 0) + 1;
      return acc;
    }, {});
  }, [sends]);

  const visibleSends = useMemo(() => {
    if (!filter) return sends;
    return sends.filter((s) => s.estado === filter);
  }, [sends, filter]);

  const failedIds = useMemo(() => sends.filter((s) => s.estado === "fallido").map((s) => s.prospect_id), [sends]);

  const handleRetryFailed = async () => {
    if (failedIds.length === 0) return;
    setRetrying(true);
    try {
      let total = 0;
      for (let i = 0; i < failedIds.length; i += SEND_BATCH_MAX) {
        const batch = failedIds.slice(i, i + SEND_BATCH_MAX);
        const res = await sendCampaignBatch(campaign.id, batch);
        total += res.sent ?? 0;
      }
      toast(`Reintento completado. ${total} enviado${total === 1 ? "" : "s"}.`, "success");
      await load();
      onChanged?.();
    } catch (err) {
      toast(userFacingFormError(err, "Fallo al reintentar."), "error");
    } finally {
      setRetrying(false);
    }
  };

  if (!campaign) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={campaign.nombre} panelClassName="max-w-5xl p-0">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <p className="text-xs text-slate-500">Asunto por defecto</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{campaign.asunto_default}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Destinatarios" value={campaign.total_destinatarios} tone="slate" />
          <Stat label="Enviados" value={campaign.total_enviados} tone="emerald" />
          <Stat label="Fallidos" value={campaign.total_fallidos} tone="rose" />
          <Stat label="Omitidos" value={campaign.total_omitidos} tone="amber" />
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {campaign.iniciada_en && <>Inició {formatDateTime(campaign.iniciada_en)}</>}
          {campaign.finalizada_en && <> · Finalizó {formatDateTime(campaign.finalizada_en)}</>}
        </div>
        {members.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Avance de audiencia</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Object.entries(members.reduce((acc, member) => {
                const key = member.estado ?? "seleccionado";
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
              }, {})).map(([estado, count]) => (
                <div key={estado} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold">{estado}</span>: {count}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <FilterPill label="Todos" value="" current={filter} count={sends.length} onClick={setFilter} />
            <FilterPill label="Enviados" value="enviado" current={filter} count={counts.enviado ?? 0} onClick={setFilter} />
            <FilterPill label="Fallidos" value="fallido" current={filter} count={counts.fallido ?? 0} onClick={setFilter} />
            <FilterPill label="Omitidos" value="omitido" current={filter} count={counts.omitido ?? 0} onClick={setFilter} />
            <FilterPill label="Bajas" value="baja" current={filter} count={counts.baja ?? 0} onClick={setFilter} />
          </div>
          {failedIds.length > 0 && (
            <Button
              type="button"
              onClick={handleRetryFailed}
              disabled={retrying}
              className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {retrying ? "Reintentando…" : `Reintentar ${failedIds.length} fallido${failedIds.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando envíos…</p>
        ) : visibleSends.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No hay envíos para este filtro.</p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">ELEAM</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">Cuando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSends.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="max-w-xs truncate px-3 py-2 font-medium text-slate-800">
                      {s.prospect?.eleam_nombre ?? "—"}
                      {s.prospect?.estado && (
                        <p className="text-[10px] font-normal text-slate-400">
                          {stageLabel(s.prospect.estado)} · {digitalizationLabel(s.prospect.digitalizacion_estado)}
                        </p>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-700">{s.email}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_TONE[s.estado] ?? ESTADO_TONE.pendiente}`}>
                        {ESTADO_LABEL[s.estado] ?? s.estado}
                      </span>
                    </td>
                    <td className="max-w-md px-3 py-2 text-[11px] text-slate-500" title={s.error_mensaje || s.resend_id || ""}>
                      <span className="line-clamp-2">{s.error_mensaje || s.resend_id || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">
                      {s.enviado_en ? formatDateTime(s.enviado_en) : formatDateTime(s.creado_en)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-right">
        <Button type="button" onClick={onClose} className="bg-teal-700 text-white hover:bg-teal-800">
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] ?? tones.slate}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value ?? 0}</p>
    </div>
  );
}

function FilterPill({ label, value, current, count, onClick }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}
