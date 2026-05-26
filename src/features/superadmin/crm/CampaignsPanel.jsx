import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/Button";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import { LeadsSkeletonList } from "../../../components/Skeleton";
import { userFacingFormError } from "../../../utils/formValidation";
import { formatDateTime } from "../../../utils/dateUtils";
import { deleteEmailCampaign, getEmailCampaigns } from "../crmEmailService";
import CampaignBuilderModal from "./CampaignBuilderModal";
import CampaignDetailModal from "./CampaignDetailModal";

const ESTADO_TONE = {
  borrador:  "bg-slate-100 text-slate-700",
  enviando:  "bg-amber-100 text-amber-800",
  enviada:   "bg-emerald-100 text-emerald-800",
  fallida:   "bg-rose-100 text-rose-800",
  cancelada: "bg-slate-100 text-slate-500",
};

const ESTADO_LABEL = {
  borrador: "Borrador",
  enviando: "Enviando…",
  enviada: "Enviada",
  fallida: "Fallida",
  cancelada: "Cancelada",
};

function EstadoBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_TONE[value] ?? ESTADO_TONE.borrador}`}>
      {ESTADO_LABEL[value] ?? value}
    </span>
  );
}

export default function CampaignsPanel({ initialSelectedProspectIds = [], onConsumeInitialSelection }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await getEmailCampaigns({ limit: 100 }));
    } catch (err) {
      toast(userFacingFormError(err, "No se pudieron cargar las campañas."), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Si llegó selección inicial desde el panel de prospectos, abre el builder.
  useEffect(() => {
    if (initialSelectedProspectIds.length > 0 && !builderOpen) {
      setBuilderOpen(true);
    }
  }, [initialSelectedProspectIds, builderOpen]);

  const handleDelete = async (campaign) => {
    if (campaign.estado !== "borrador") {
      toast("Solo se pueden eliminar campañas en borrador.", "warning");
      return;
    }
    const ok = await confirm({
      title: "¿Eliminar borrador?",
      message: `Se eliminará "${campaign.nombre}". Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEmailCampaign(campaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      toast("Campaña eliminada.", "success");
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo eliminar."), "error");
    }
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    onConsumeInitialSelection?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Campañas comerciales</h3>
          <p className="text-xs text-slate-500">Cada campaña tiene plantillas maestras de correo, RRSS y llamada. El avance se mide por audiencia.</p>
        </div>
        <Button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="bg-teal-700 text-white hover:bg-teal-800"
        >
          + Nueva campaña
        </Button>
      </div>

      {loading ? (
        <LeadsSkeletonList count={3} />
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Aún no hay campañas</p>
          <p className="mt-1 text-xs text-slate-500">Crea una nueva o selecciona prospectos desde la pestaña anterior para empezar.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Campaña</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Destinatarios</th>
                  <th className="px-3 py-2.5 text-right">Enviados</th>
                  <th className="px-3 py-2.5 text-right">Fallidos</th>
                  <th className="px-3 py-2.5 text-right">Omitidos</th>
                  <th className="px-3 py-2.5">Fechas</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="max-w-xs px-3 py-2.5">
                      <p className="truncate font-semibold text-slate-900" title={c.nombre}>{c.nombre}</p>
                      <p className="truncate text-[11px] text-slate-500" title={c.asunto_default}>{c.asunto_default}</p>
                    </td>
                    <td className="px-3 py-2.5"><EstadoBadge value={c.estado} /></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.total_destinatarios}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700 tabular-nums">{c.total_enviados}</td>
                    <td className="px-3 py-2.5 text-right text-rose-700 tabular-nums">{c.total_fallidos}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{c.total_omitidos}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">
                      {c.finalizada_en
                        ? `Finalizó ${formatDateTime(c.finalizada_en)}`
                        : c.iniciada_en
                          ? `Inició ${formatDateTime(c.iniciada_en)}`
                          : `Creada ${formatDateTime(c.creado_en)}`}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailCampaign(c)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Ver detalle
                      </button>
                      {c.estado === "borrador" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="space-y-3 lg:hidden">
            {campaigns.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900">{c.nombre}</h4>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{c.asunto_default}</p>
                  </div>
                  <EstadoBadge value={c.estado} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 border-y border-slate-100 py-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
                    <p className="text-sm font-bold tabular-nums">{c.total_destinatarios}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">OK</p>
                    <p className="text-sm font-bold text-emerald-700 tabular-nums">{c.total_enviados}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Fail</p>
                    <p className="text-sm font-bold text-rose-700 tabular-nums">{c.total_fallidos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Skip</p>
                    <p className="text-sm font-bold text-slate-500 tabular-nums">{c.total_omitidos}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailCampaign(c)}
                    className="flex-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700"
                  >
                    Ver detalle
                  </button>
                  {c.estado === "borrador" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="flex-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <CampaignBuilderModal
        isOpen={builderOpen}
        initialProspectIds={initialSelectedProspectIds}
        onClose={handleBuilderClose}
        onSent={() => { handleBuilderClose(); load(); }}
      />

      {detailCampaign && (
        <CampaignDetailModal
          isOpen={true}
          campaign={detailCampaign}
          onClose={() => setDetailCampaign(null)}
          onChanged={() => { load(); }}
        />
      )}
    </div>
  );
}
