import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import FilterBar from "../../../components/FilterBar";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import { LeadsSkeletonList } from "../../../components/Skeleton";
import { useFilterParams } from "../../../hooks/useFilterParams";
import { userFacingFormError } from "../../../utils/formValidation";
import { formatDateTime } from "../../../utils/dateUtils";
import {
  deleteProspect,
  getProspectLists,
  getProspects,
  setProspectNoContactar,
} from "../crmEmailService";
import { PROSPECT_ESTADOS } from "../crmEmailFormSchema";
import {
  digitalizationLabel,
  stageGuideText,
  stageLabel,
  stageTone,
} from "./crmSalesPlaybook";
import ProspectFormModal from "./ProspectFormModal";
import ProspectImportModal from "./ProspectImportModal";

function EstadoBadge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageTone(value)}`}>
      {stageLabel(value)}
    </span>
  );
}

export default function ProspectsPanel({ initialListId = null, onStartCampaign }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [lists, setLists] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pFilters, setPFilter, clearPFilters] = useFilterParams({
    schema: { listId: "string", estado: "string", q: "string" },
    defaults: { listId: initialListId ?? "", estado: "", q: "" },
  });
  const filterList = pFilters.listId ?? "";
  const filterEstado = pFilters.estado ?? "";
  const search = pFilters.q ?? "";
  const setSearch = (value) => setPFilter("q", value);
  const [selected, setSelected] = useState(() => new Set());

  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listsData, prospectsData] = await Promise.all([
        getProspectLists(),
        getProspects({
          listId: filterList || null,
          estado: filterEstado || null,
          search,
          limit: 500,
        }),
      ]);
      setLists(listsData);
      setProspects(prospectsData);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudieron cargar los prospectos."), "error");
    } finally {
      setLoading(false);
    }
  }, [filterList, filterEstado, search, toast]);

  useEffect(() => { load(); }, [load]);

  // Reset selección al filtrar
  useEffect(() => { setSelected(new Set()); }, [filterList, filterEstado, search]);

  const visibleIds = useMemo(() => prospects.map((p) => p.id), [prospects]);

  const allSelected = selected.size > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleIds));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const handleDelete = async (prospect) => {
    const ok = await confirm({
      title: "¿Eliminar prospecto?",
      message: `Se eliminará "${prospect.eleam_nombre}" y todos sus envíos asociados.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProspect(prospect.id);
      setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
      toast("Prospecto eliminado.", "success");
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo eliminar."), "error");
    }
  };

  const handleNoContactar = async (prospect) => {
    const target = !prospect.no_contactar;
    if (target) {
      const ok = await confirm({
        title: "¿Marcar como no contactar?",
        message: "Este prospecto dejará de recibir campañas y no podrá ser incluido en envíos futuros.",
        confirmText: "Marcar",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const updated = await setProspectNoContactar(prospect.id, target);
      setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast(target ? "Marcado como no contactar." : "Reactivado.", "success");
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo actualizar."), "error");
    }
  };

  const startCampaignWithSelected = () => {
    if (selectedIds.length === 0) {
      toast("Selecciona al menos un prospecto.", "warning");
      return;
    }
    onStartCampaign?.(selectedIds);
  };

  const listOptions = lists.map((l) => [l.id, l.nombre]);
  const estadoOptions = PROSPECT_ESTADOS.map((est) => [est, stageLabel(est)]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por ELEAM, comuna, email, software o dolor..."
          filters={[
            { type: "select", name: "listId", label: "Lista", options: listOptions, placeholder: "Todas las listas" },
            { type: "select", name: "estado", label: "Etapa", options: estadoOptions, placeholder: "Todas las etapas" },
          ]}
          values={pFilters}
          onFilterChange={setPFilter}
          onClearAll={clearPFilters}
          resultCount={loading ? undefined : prospects.length}
          loading={loading}
        >
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              onClick={() => setImportOpen(true)}
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              title={filterList ? "Importar prospectos a la lista seleccionada" : "Importar prospectos sin lista"}
            >
              Importar Excel
            </Button>
            <Button
              type="button"
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              + Nuevo prospecto
            </Button>
          </div>
        </FilterBar>
      </div>

      {/* Selección masiva */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-teal-900">
            <strong>{selectedIds.length}</strong> prospecto{selectedIds.length === 1 ? "" : "s"} seleccionado{selectedIds.length === 1 ? "" : "s"}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
            >
              Limpiar
            </button>
            <Button
              type="button"
              onClick={startCampaignWithSelected}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              Crear campaña con la selección →
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <LeadsSkeletonList count={5} />
      ) : prospects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No hay prospectos que coincidan</p>
          <p className="mt-1 text-xs text-slate-500">
            Cambia los filtros, importa una planilla o crea uno manualmente.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todos"
                      className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                    />
                  </th>
                  <th className="px-3 py-2.5">ELEAM</th>
                  <th className="px-3 py-2.5">Comuna</th>
                  <th className="px-3 py-2.5">Contacto</th>
                  <th className="px-3 py-2.5">Etapa</th>
                  <th className="px-3 py-2.5">Calificación</th>
                  <th className="px-3 py-2.5">Próxima acción</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prospects.map((p) => (
                  <tr key={p.id} className={`${p.no_contactar ? "bg-rose-50/40" : "hover:bg-slate-50"} transition-colors`}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        disabled={p.no_contactar}
                        aria-label={`Seleccionar ${p.eleam_nombre}`}
                        className="h-4 w-4 rounded border-slate-300 accent-teal-700 disabled:opacity-30"
                      />
                    </td>
                    <td className="max-w-xs px-3 py-2.5">
                      <p className="truncate font-semibold text-slate-900" title={p.eleam_nombre}>{p.eleam_nombre}</p>
                      {p.dolor_principal && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={p.dolor_principal}>{p.dolor_principal}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{p.comuna || "—"}</td>
                    <td className="max-w-[14rem] px-3 py-2.5">
                      <p className="truncate text-slate-800">{p.email || <span className="text-slate-400">Sin correo</span>}</p>
                      {p.telefono && <p className="truncate text-[11px] text-slate-500">{p.telefono}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <EstadoBadge value={p.estado} />
                        <span title={stageGuideText(p.estado)} className="cursor-help text-[11px] text-slate-400">?</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      <p>{digitalizationLabel(p.digitalizacion_estado)}</p>
                      <p className="text-[11px] text-slate-400">Fit {p.fit_score ?? 50} · {p.num_residentes ? `${p.num_residentes} res.` : "sin tamaño"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {p.proxima_accion_fecha || (p.ultimo_email_enviado_en ? `Email ${formatDateTime(p.ultimo_email_enviado_en)}` : "—")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditing(p); setFormOpen(true); }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Ficha 360
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNoContactar(p)}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${p.no_contactar ? "text-emerald-700 hover:bg-emerald-50" : "text-amber-700 hover:bg-amber-50"}`}
                        >
                          {p.no_contactar ? "Reactivar" : "No contactar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 lg:hidden">
            {prospects.map((p) => (
              <li
                key={p.id}
                className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${p.no_contactar ? "border-rose-200 bg-rose-50/30" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    disabled={p.no_contactar}
                    aria-label={`Seleccionar ${p.eleam_nombre}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-700 disabled:opacity-30"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{p.eleam_nombre}</h4>
                      <EstadoBadge value={p.estado} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{p.comuna || "Sin comuna"}</p>
                    {p.dolor_principal && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{p.dolor_principal}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">{digitalizationLabel(p.digitalizacion_estado)} · Fit {p.fit_score ?? 50}</p>
                    {p.email && <p className="mt-2 truncate text-xs text-slate-700">📧 {p.email}</p>}
                    {p.telefono && <p className="truncate text-xs text-slate-500">📞 {p.telefono}</p>}
                    {p.ultimo_email_enviado_en && (
                      <p className="mt-1 text-[11px] text-slate-400">Último envío: {formatDateTime(p.ultimo_email_enviado_en)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => { setEditing(p); setFormOpen(true); }}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNoContactar(p)}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${p.no_contactar ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`}
                  >
                    {p.no_contactar ? "Reactivar" : "No contactar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="flex-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ProspectFormModal
        isOpen={formOpen}
        prospect={editing}
        lists={lists}
        defaultListId={filterList || null}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <ProspectImportModal
        isOpen={importOpen}
        listId={filterList || null}
        existingProspects={prospects}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); load(); }}
      />
    </div>
  );
}
