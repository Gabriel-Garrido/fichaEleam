import { useEffect, useState } from "react";
import Button from "../../../components/Button";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import { LeadsSkeletonList } from "../../../components/Skeleton";
import { userFacingFormError } from "../../../utils/formValidation";
import { formatDateTime } from "../../../utils/dateUtils";
import { deleteProspectList, getProspectLists } from "../crmEmailService";
import ListFormModal from "./ListFormModal";

export default function ProspectListsPanel({ onPickList }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setLists(await getProspectLists());
    } catch (err) {
      toast(userFacingFormError(err, "No se pudieron cargar las listas."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (list) => {
    const ok = await confirm({
      title: "¿Eliminar lista?",
      message: `Se eliminará la lista "${list.nombre}". Los prospectos asociados quedarán sin lista, pero no se borran.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProspectList(list.id);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
      toast("Lista eliminada.", "success");
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo eliminar la lista."), "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Listas de prospectos</h3>
          <p className="text-xs text-slate-500">Agrupa los ELEAMs por cohorte, comuna o campaña. Los prospectos siempre pertenecen a una lista.</p>
        </div>
        <Button
          type="button"
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-teal-700 text-white hover:bg-teal-800"
        >
          + Nueva lista
        </Button>
      </div>

      {loading ? (
        <LeadsSkeletonList count={3} />
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Aún no hay listas</p>
          <p className="mt-1 text-xs text-slate-500">Crea la primera para empezar a importar prospectos.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => onPickList?.(list)}
                className="tap-highlight-none -m-2 mb-2 rounded-xl p-2 text-left transition-colors hover:bg-slate-50"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  {list.origen === "import_excel" ? "Importada" : "Manual"}
                </p>
                <h4 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">{list.nombre}</h4>
                {list.descripcion && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{list.descripcion}</p>
                )}
                <p className="mt-2 text-[11px] text-slate-400">Creada {formatDateTime(list.creado_en)}</p>
              </button>
              <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => { setEditing(list); setModalOpen(true); }}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(list)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Eliminar
                </button>
                <span className="ml-auto text-[11px] text-slate-400">Click en el título para ver prospectos →</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ListFormModal
        isOpen={modalOpen}
        list={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}
