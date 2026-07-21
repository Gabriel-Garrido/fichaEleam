import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly, todayIso } from "../../utils/dateUtils";
import {
  COMPETENCY_CATALOG,
  TIPO_DOTACION_LABEL,
  createStaffMember,
  listCompetenciesAndTraining,
  listStaffMembers,
  saveCompetency,
  saveTrainingRecord,
  syncStaffMembersFromProfiles,
  updateStaffMember,
} from "./staffingService";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const COMPETENCIA_ESTADO_LABEL = {
  vigente: "Vigente",
  pendiente: "Pendiente",
  vence_pronto: "Vence pronto",
  vencida: "Vencida",
  no_aplica: "No aplica",
};

function statusTone(status) {
  if (status === "vigente") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "vence_pronto") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "vencida") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "no_aplica") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function FieldLabel({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function yearlyHours(training, staffId) {
  const year = todayIso().slice(0, 4);
  return training
    .filter((item) => item.staff_member_id === staffId && String(item.fecha || "").startsWith(year))
    .reduce((sum, item) => sum + Number(item.horas || 0), 0);
}

export default function StaffCompetenciesTab() {
  const toast = useToast();
  const { isAdminEleam } = useAuth();
  const [staff, setStaff] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [training, setTraining] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMember, setNewMember] = useState({ nombre: "", cargo: "", tipo_dotacion: "cuidador" });
  const [memberDraft, setMemberDraft] = useState({ cargo: "", tipo_dotacion: "cuidador", activo: true });
  const [competencyDraft, setCompetencyDraft] = useState({
    competencia: COMPETENCY_CATALOG[0],
    estado: "vigente",
    fecha_emision: todayIso(),
    fecha_vencimiento: "",
    notas: "",
  });
  const [trainingDraft, setTrainingDraft] = useState({
    nombre: "",
    tema: "",
    fecha: todayIso(),
    horas: "",
    proveedor: "",
    notas: "",
  });

  const selected = staff.find((item) => item.id === selectedId) ?? staff[0] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const synced = isAdminEleam ? await syncStaffMembersFromProfiles() : await listStaffMembers();
      const data = await listCompetenciesAndTraining();
      setStaff(synced);
      setCompetencies(data.competencies);
      setTraining(data.training);
      setSelectedId((prev) => prev ?? synced[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo cargar competencias.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdminEleam, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setMemberDraft({
      cargo: selected.cargo ?? "",
      tipo_dotacion: selected.tipo_dotacion ?? "cuidador",
      activo: selected.activo !== false,
    });
  }, [selected]);

  const selectedCompetencies = useMemo(
    () => competencies.filter((item) => item.staff_member_id === selected?.id),
    [competencies, selected?.id],
  );
  const selectedTraining = useMemo(
    () => training.filter((item) => item.staff_member_id === selected?.id),
    [training, selected?.id],
  );

  const saveMember = async () => {
    if (!selected) return;
    if (!isAdminEleam) {
      toast("Solo administradores pueden editar personal DS20.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateStaffMember(selected.id, memberDraft);
      setStaff((prev) => prev.map((item) => item.id === saved.id ? saved : item));
      toast("Ficha de personal actualizada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo actualizar el personal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (!newMember.nombre.trim()) return;
    setSaving(true);
    try {
      const saved = await createStaffMember(newMember);
      setStaff((current) => [...current, saved]);
      setSelectedId(saved.id);
      setNewMember({ nombre: "", cargo: "", tipo_dotacion: "cuidador" });
      toast("Persona agregada a la planta.", "success");
    } catch (error) {
      toast(error.message || "No se pudo agregar la persona.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCompetencyDraft = async () => {
    if (!selected) return;
    if (!isAdminEleam) {
      toast("Solo administradores pueden registrar competencias.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompetency(selected.id, competencyDraft);
      setCompetencies((prev) => [...prev.filter((item) => !(item.staff_member_id === saved.staff_member_id && item.competencia === saved.competencia)), saved]);
      toast("Competencia guardada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo guardar la competencia.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveTrainingDraft = async () => {
    if (!isAdminEleam) {
      toast("Solo administradores pueden registrar capacitaciones.", "warning");
      return;
    }
    if (!selected || !trainingDraft.nombre.trim()) {
      toast("Indica el nombre de la capacitación.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveTrainingRecord(selected.id, trainingDraft);
      setTraining((prev) => [saved, ...prev]);
      setTrainingDraft({ nombre: "", tema: "", fecha: todayIso(), horas: "", proveedor: "", notas: "" });
      toast("Capacitación registrada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo guardar la capacitación.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando competencias..." />;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">Personal DS20</h2>
          <p className="mt-1 text-xs text-slate-500">Usuarios del ELEAM sincronizados para competencias y dotación.</p>
        </div>
        {isAdminEleam && (
          <details className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-teal-800">Agregar persona sin acceso al sistema</summary>
            <form onSubmit={addMember} className="mt-3 space-y-2">
              <input aria-label="Nombre de la persona" required className={inputClass} value={newMember.nombre} onChange={(event) => setNewMember((current) => ({ ...current, nombre: event.target.value }))} placeholder="Nombre completo" />
              <input aria-label="Cargo de la persona" className={inputClass} value={newMember.cargo} onChange={(event) => setNewMember((current) => ({ ...current, cargo: event.target.value }))} placeholder="Cargo (opcional)" />
              <select aria-label="Tipo de dotación" className={inputClass} value={newMember.tipo_dotacion} onChange={(event) => setNewMember((current) => ({ ...current, tipo_dotacion: event.target.value }))}>
                {Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button type="submit" disabled={saving || !newMember.nombre.trim()} className="w-full bg-teal-700 text-white">Agregar a planta</Button>
            </form>
          </details>
        )}
        {staff.length === 0 ? (
          <p className="text-sm text-slate-500">Sin personal registrado.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${selected?.id === item.id ? "border-teal-300 bg-teal-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <p className="truncate text-sm font-semibold text-slate-900">{item.nombre}</p>
                  <p className="truncate text-xs text-slate-500">{item.cargo || "Sin cargo"} · {TIPO_DOTACION_LABEL[item.tipo_dotacion] ?? item.tipo_dotacion}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{yearlyHours(training, item.id)} h año actual</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="space-y-5">
          {!isAdminEleam && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Vista de solo lectura. La edición de competencias, capacitaciones y dotación de personal requiere rol administrador.
            </div>
          )}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selected.nombre}</h2>
                <p className="text-xs text-slate-500">{selected.email || "Sin correo"} · {yearlyHours(training, selected.id)} horas de capacitación este año</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${selected.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {selected.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Cargo
                <input className={inputClass} value={memberDraft.cargo} disabled={saving || !isAdminEleam} onChange={(e) => setMemberDraft((p) => ({ ...p, cargo: e.target.value }))} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Tipo dotación
                <select className={inputClass} value={memberDraft.tipo_dotacion} disabled={saving || !isAdminEleam} onChange={(e) => setMemberDraft((p) => ({ ...p, tipo_dotacion: e.target.value }))}>
                  {Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={memberDraft.activo} disabled={saving || !isAdminEleam} onChange={(e) => setMemberDraft((p) => ({ ...p, activo: e.target.checked }))} className="h-4 w-4 accent-teal-700" />
                Activo para turnos
              </label>
            </div>
            {isAdminEleam && <div className="mt-3 flex justify-end">
              <Button type="button" onClick={saveMember} disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800">Guardar personal</Button>
            </div>}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Competencias y certificados</h3>
            <div className="mb-4 grid items-end gap-3 sm:grid-cols-2 md:grid-cols-5">
              <FieldLabel label="Competencia">
                <select className={inputClass} value={competencyDraft.competencia} disabled={saving || !isAdminEleam} onChange={(e) => setCompetencyDraft((p) => ({ ...p, competencia: e.target.value }))}>
                  {COMPETENCY_CATALOG.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="Estado">
                <select className={inputClass} value={competencyDraft.estado} disabled={saving || !isAdminEleam} onChange={(e) => setCompetencyDraft((p) => ({ ...p, estado: e.target.value }))}>
                  {Object.entries(COMPETENCIA_ESTADO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Fecha de emisión">
                <input type="date" className={inputClass} value={competencyDraft.fecha_emision} disabled={saving || !isAdminEleam} onChange={(e) => setCompetencyDraft((p) => ({ ...p, fecha_emision: e.target.value }))} />
              </FieldLabel>
              <FieldLabel label="Fecha de vencimiento">
                <input type="date" className={inputClass} value={competencyDraft.fecha_vencimiento} disabled={saving || !isAdminEleam} onChange={(e) => setCompetencyDraft((p) => ({ ...p, fecha_vencimiento: e.target.value }))} />
              </FieldLabel>
              {isAdminEleam && <Button type="button" onClick={saveCompetencyDraft} disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800">Guardar</Button>}
            </div>
            {selectedCompetencies.length === 0 ? (
              <p className="text-sm text-slate-500">Sin competencias registradas.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {selectedCompetencies.map((item) => (
                  <div key={item.id} className={`rounded-2xl border p-3 ${statusTone(item.estado)}`}>
                    <p className="text-sm font-semibold">{item.competencia}</p>
                    <p className="mt-1 text-xs">Estado: {COMPETENCIA_ESTADO_LABEL[item.estado] ?? item.estado}</p>
                    {item.fecha_vencimiento && <p className="text-xs">Vence: {formatDateOnly(item.fecha_vencimiento)}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Capacitaciones</h3>
            <div className="mb-4 grid items-end gap-3 sm:grid-cols-2 md:grid-cols-5">
              <FieldLabel label="Capacitación">
                <input className={inputClass} value={trainingDraft.nombre} disabled={saving || !isAdminEleam} onChange={(e) => setTrainingDraft((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Curso RCP básico" />
              </FieldLabel>
              <FieldLabel label="Tema">
                <input className={inputClass} value={trainingDraft.tema} disabled={saving || !isAdminEleam} onChange={(e) => setTrainingDraft((p) => ({ ...p, tema: e.target.value }))} placeholder="Ej: Urgencias" />
              </FieldLabel>
              <FieldLabel label="Fecha realizada">
                <input type="date" className={inputClass} value={trainingDraft.fecha} disabled={saving || !isAdminEleam} onChange={(e) => setTrainingDraft((p) => ({ ...p, fecha: e.target.value }))} />
              </FieldLabel>
              <FieldLabel label="Horas">
                <input type="number" min="0" step="0.5" className={inputClass} value={trainingDraft.horas} disabled={saving || !isAdminEleam} onChange={(e) => setTrainingDraft((p) => ({ ...p, horas: e.target.value }))} placeholder="Ej: 4" />
              </FieldLabel>
              {isAdminEleam && <Button type="button" onClick={saveTrainingDraft} disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800">Agregar</Button>}
            </div>
            {selectedTraining.length === 0 ? (
              <p className="text-sm text-slate-500">Sin capacitaciones registradas.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selectedTraining.map((item) => (
                  <li key={item.id} className="py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                        <p className="text-xs text-slate-500">{item.tema || "Sin tema"} · {formatDateOnly(item.fecha)}</p>
                      </div>
                      <span className="w-fit rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{Number(item.horas || 0)} h</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
