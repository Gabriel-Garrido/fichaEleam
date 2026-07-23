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
import StaffPermissionsModal from "../team/StaffPermissionsModal";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useConfirm } from "../../components/ConfirmDialog";
import { sendStaffPasswordRecovery, updateStaffUser } from "../team/teamService";

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

function searchableText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function initials(name) {
  return String(name ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function StaffCompetenciesTab({ onAddWithAccess = null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdminEleam } = useAuth();
  const [staff, setStaff] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [training, setTraining] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddWithoutAccess, setShowAddWithoutAccess] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffStatus, setStaffStatus] = useState("activos");
  const [detailView, setDetailView] = useState("resumen");
  const [newMember, setNewMember] = useState({ nombre: "", cargo: "", tipo_dotacion: "cuidador" });
  const [memberDraft, setMemberDraft] = useState({ nombre: "", telefono: "", cargo: "", tipo_dotacion: "cuidador", activo: true });
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
  const filteredStaff = useMemo(() => {
    const query = searchableText(staffSearch);
    return staff.filter((item) => {
      if (staffStatus === "activos" && item.activo === false) return false;
      if (staffStatus === "inactivos" && item.activo !== false) return false;
      if (!query) return true;
      return searchableText([
        item.nombre,
        item.email,
        item.cargo,
        TIPO_DOTACION_LABEL[item.tipo_dotacion] ?? item.tipo_dotacion,
      ].join(" ")).includes(query);
    });
  }, [staff, staffSearch, staffStatus]);

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
      toast(error.message || "No se pudo cargar la información del equipo.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdminEleam, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setMemberDraft({
      nombre: selected.nombre ?? "",
      telefono: selected.telefono ?? "",
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

  const saveMember = async (event) => {
    event?.preventDefault();
    if (!selected) return;
    if (!isAdminEleam) {
      toast("Solo el administrador puede editar esta información.", "warning");
      return;
    }
    setSaving(true);
    try {
      if (selected.profile_id) {
        await updateStaffUser(selected.profile_id, memberDraft);
        await load();
      } else {
        const saved = await updateStaffMember(selected.id, memberDraft);
        setStaff((prev) => prev.map((item) => item.id === saved.id ? { ...saved, nombre: memberDraft.nombre, telefono: memberDraft.telefono } : item));
      }
      setShowEdit(false);
      toast("Datos del funcionario actualizados.", "success");
    } catch (error) {
      toast(error.message || "No se pudo actualizar el personal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!selected?.profile_id || !selected.email) return;
    const accepted = await confirm({
      title: "Restablecer contraseña",
      message: `Enviaremos a ${selected.email} un enlace personal para crear una nueva contraseña.`,
      confirmLabel: "Enviar correo",
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await sendStaffPasswordRecovery(selected.profile_id);
      toast("Correo de recuperación enviado.", "success");
    } catch (error) {
      toast(error.message || "No se pudo enviar el correo de recuperación.", "error");
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
      setShowAddWithoutAccess(false);
      toast("Persona agregada al equipo.", "success");
    } catch (error) {
      toast(error.message || "No se pudo agregar la persona.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCompetencyDraft = async () => {
    if (!selected) return;
    if (!isAdminEleam) {
      toast("Solo el administrador puede registrar documentos.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompetency(selected.id, competencyDraft);
      setCompetencies((prev) => [...prev.filter((item) => !(item.staff_member_id === saved.staff_member_id && item.competencia === saved.competencia)), saved]);
      toast("Información guardada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo guardar la información.", "error");
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
      toast("Indica el nombre del curso.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveTrainingRecord(selected.id, trainingDraft);
      setTraining((prev) => [saved, ...prev]);
      setTrainingDraft({ nombre: "", tema: "", fecha: todayIso(), horas: "", proveedor: "", notas: "" });
      toast("Curso registrado.", "success");
    } catch (error) {
      toast(error.message || "No se pudo guardar el curso.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando equipo..." />;

  return (
    <div className="space-y-4">
      {isAdminEleam && <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-bold text-slate-900">Agregar una persona</p><p className="mt-1 text-xs leading-5 text-slate-500">Crea una cuenta solo si necesita usar el sistema.</p></div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          {onAddWithAccess && <Button type="button" onClick={onAddWithAccess} className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">Agregar con acceso</Button>}
          <Button type="button" onClick={() => setShowAddWithoutAccess(true)} className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">Agregar sin acceso</Button>
        </div>
      </section>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-4">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="font-bold text-slate-900">Directorio</h2><HelpTooltip label="Ayuda sobre el directorio">Incluye todas las personas del equipo, tengan o no una cuenta para entrar al sistema.</HelpTooltip></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{staff.length}</span></div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Busca y selecciona una persona para abrir su ficha.</p>
        </div>
        {staff.length > 0 && <div className="mb-3 space-y-2">
          <label className="relative block">
            <span className="sr-only">Buscar una persona</span>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
            <input type="search" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Buscar por nombre, cargo o correo" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100" />
            {staffSearch && <button type="button" onClick={() => setStaffSearch("")} aria-label="Limpiar búsqueda" className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-lg text-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700">×</button>}
          </label>
          <div className="flex items-center justify-between gap-2">
            <label className="min-w-0"><span className="sr-only">Filtrar por estado</span><select value={staffStatus} onChange={(event) => setStaffStatus(event.target.value)} className="min-h-9 max-w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500"><option value="activos">Solo activos</option><option value="todos">Todos</option><option value="inactivos">Solo inactivos</option></select></label>
            <p className="shrink-0 text-xs font-semibold text-slate-500" aria-live="polite">{filteredStaff.length} de {staff.length}</p>
          </div>
        </div>}
        {staff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><p className="text-sm font-semibold text-slate-700">Aún no hay personas</p><p className="mt-1 text-xs leading-5 text-slate-500">Agrega el primer integrante del equipo para comenzar.</p></div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><p className="text-sm font-semibold text-slate-700">No encontramos resultados</p><p className="mt-1 text-xs leading-5 text-slate-500">Prueba con otro nombre, cargo o cambia el filtro.</p><button type="button" onClick={() => { setStaffSearch(""); setStaffStatus("todos"); }} className="mt-3 text-xs font-bold text-teal-700 hover:text-teal-900">Ver todo el equipo</button></div>
        ) : (
          <ul className="max-h-[48vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-19rem)]" aria-label="Personas del equipo">
            {filteredStaff.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={selected?.id === item.id}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${selected?.id === item.id ? "border-teal-400 bg-teal-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${selected?.id === item.id ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>{initials(item.nombre)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold text-slate-900">{item.nombre}</p>{selected?.id === item.id && <span className="shrink-0 rounded-full bg-teal-700 px-2 py-1 text-[9px] font-bold text-white">Seleccionado</span>}</div>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{item.cargo || "Sin cargo registrado"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{TIPO_DOTACION_LABEL[item.tipo_dotacion] ?? item.tipo_dotacion}</span>{item.profile?.rol && <RolePill role={item.profile.rol} />}{!item.profile_id && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Sin acceso</span>}{item.activo === false && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Inactivo</span>}</div>
                      <p className="mt-2 text-[11px] font-medium text-slate-500">{yearlyHours(training, item.id)} horas de cursos este año</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="min-w-0 space-y-4">
          {!isAdminEleam && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Puedes consultar esta información. Solo el administrador puede hacer cambios.
            </div>
          )}
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-sm font-bold text-white">{initials(selected.nombre)}</span>
                <div className="min-w-0"><p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-700">Persona seleccionada</p><h2 className="truncate text-xl font-bold text-slate-900">{selected.nombre}</h2><p className="truncate text-xs text-slate-500">{selected.email || "Sin correo asociado"}</p></div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${selected.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{selected.activo ? "Activo" : "Inactivo"}</span>
                {isAdminEleam && <Button type="button" onClick={() => setShowEdit(true)} className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">Editar datos</Button>}
                {isAdminEleam && selected.profile_id && selected.profile?.rol === "funcionario" && <Button type="button" onClick={() => setShowPermissions(true)} className="w-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 sm:w-auto">Gestionar permisos</Button>}
              </div>
            </div>
            {detailView === "resumen" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Detail label="Cargo" value={selected.cargo || "Sin cargo"} />
              <Detail label="Función en el equipo" value={TIPO_DOTACION_LABEL[selected.tipo_dotacion] ?? selected.tipo_dotacion} />
              <Detail label="Acceso a FichaEleam" value={selected.profile_id ? "Con acceso" : "Sin acceso"} />
              <Detail label="Cursos del año" value={`${yearlyHours(training, selected.id)} horas`} />
            </div>}
            </div>
            <nav className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70 p-1.5" aria-label="Secciones de la persona">
              <DetailTab active={detailView === "resumen"} onClick={() => setDetailView("resumen")} label="Resumen" />
              <DetailTab active={detailView === "documentos"} onClick={() => setDetailView("documentos")} label="Documentos" count={selectedCompetencies.length} />
              <DetailTab active={detailView === "cursos"} onClick={() => setDetailView("cursos")} label="Cursos" count={selectedTraining.length} />
            </nav>
          </section>

          {detailView === "resumen" && <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-bold text-slate-900">Vista general</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Usa las pestañas para revisar los documentos o cursos de {selected.nombre}. Para cambiar sus datos básicos, selecciona “Editar datos”.</p>
          </section>}

          {detailView === "documentos" && <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-2"><div><h3 className="text-base font-bold text-slate-900">Documentos y habilidades</h3><p className="mt-1 text-xs leading-5 text-slate-500">Mantén al día los antecedentes correspondientes a esta persona.</p></div><HelpTooltip label="Ayuda sobre habilidades y documentos">Registra las competencias y certificados requeridos según la función de la persona y el DS20.</HelpTooltip></div>
            <div className="mb-5 grid items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <FieldLabel label="Habilidad o documento">
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
              {isAdminEleam && <div className="sm:col-span-2 xl:col-span-4 flex justify-end"><Button type="button" onClick={saveCompetencyDraft} disabled={saving} className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">Guardar documento</Button></div>}
            </div>
            {selectedCompetencies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center"><p className="text-sm font-semibold text-slate-700">Sin documentos registrados</p><p className="mt-1 text-xs text-slate-500">Cuando agregues uno, aparecerá aquí.</p></div>
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
          </section>}

          {detailView === "cursos" && <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4"><h3 className="text-base font-bold text-slate-900">Cursos realizados</h3><p className="mt-1 text-xs leading-5 text-slate-500">Registra la capacitación de esta persona y sus horas realizadas.</p></div>
            <div className="mb-5 grid items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <FieldLabel label="Nombre del curso">
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
              {isAdminEleam && <div className="sm:col-span-2 xl:col-span-4 flex justify-end"><Button type="button" onClick={saveTrainingDraft} disabled={saving} className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">Agregar curso</Button></div>}
            </div>
            {selectedTraining.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center"><p className="text-sm font-semibold text-slate-700">Sin cursos registrados</p><p className="mt-1 text-xs text-slate-500">Cuando agregues uno, aparecerá aquí.</p></div>
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
          </section>}
        </div>
      )}
      </div>
      <StaffPermissionsModal member={selected?.profile_id ? { id: selected.profile_id, nombre: selected.nombre } : null} isOpen={showPermissions} onClose={() => setShowPermissions(false)} />
      <Modal isOpen={isAdminEleam && showEdit && Boolean(selected)} onClose={() => !saving && setShowEdit(false)} title="Editar datos del funcionario">
        <form onSubmit={saveMember} className="space-y-4">
          <FieldLabel label="Nombre completo"><input required minLength={2} className={inputClass} value={memberDraft.nombre} disabled={saving} onChange={(event) => setMemberDraft((current) => ({ ...current, nombre: event.target.value }))} /></FieldLabel>
          {selected?.profile_id && <FieldLabel label="Correo"><input type="email" className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`} value={selected.email || ""} disabled aria-describedby="staff-email-help" /><span id="staff-email-help" className="mt-1.5 block text-xs leading-5 text-slate-500">El correo identifica la cuenta y no se puede cambiar.</span></FieldLabel>}
          <FieldLabel label="Teléfono"><input type="tel" className={inputClass} value={memberDraft.telefono} disabled={saving} onChange={(event) => setMemberDraft((current) => ({ ...current, telefono: event.target.value }))} placeholder="Ej: +56 9 1234 5678" /></FieldLabel>
          <FieldLabel label="Cargo"><input required className={inputClass} value={memberDraft.cargo} disabled={saving} onChange={(event) => setMemberDraft((current) => ({ ...current, cargo: event.target.value }))} placeholder="Ej: TENS de turno" /></FieldLabel>
          <FieldLabel label="Función en el equipo"><select className={inputClass} value={memberDraft.tipo_dotacion} disabled={saving} onChange={(event) => setMemberDraft((current) => ({ ...current, tipo_dotacion: event.target.value }))}>{Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={memberDraft.activo} disabled={saving} onChange={(event) => setMemberDraft((current) => ({ ...current, activo: event.target.checked }))} className="h-4 w-4 accent-teal-700" />Disponible para asignar turnos</label>
          {selected?.profile_id && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-950">¿Necesita una nueva contraseña?</p><p className="mt-1 text-xs leading-5 text-amber-800">Enviaremos un enlace de recuperación a su correo. Sus datos no guardados en este formulario no se perderán.</p><Button type="button" onClick={resetPassword} disabled={saving} className="mt-3 border border-amber-300 bg-white text-amber-900 hover:bg-amber-100">Restablecer contraseña</Button></div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setShowEdit(false)} disabled={saving} className="border border-slate-200 bg-white text-slate-700">Cancelar</Button><Button type="submit" disabled={saving || memberDraft.nombre.trim().length < 2 || !memberDraft.cargo.trim()} className="bg-teal-700 text-white hover:bg-teal-800">{saving ? "Guardando..." : "Guardar cambios"}</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isAdminEleam && showAddWithoutAccess} onClose={() => !saving && setShowAddWithoutAccess(false)} title="Agregar funcionario sin acceso">
        <form onSubmit={addMember} className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>No tendrá una cuenta en FichaEleam.</strong> Solo aparecerá como parte del equipo, en los turnos y en sus registros de cursos y documentos.</div>
          <FieldLabel label="Nombre completo"><input aria-label="Nombre de la persona" required className={inputClass} value={newMember.nombre} onChange={(event) => setNewMember((current) => ({ ...current, nombre: event.target.value }))} placeholder="Ej: Ana Pérez" /></FieldLabel>
          <FieldLabel label="Cargo"><input aria-label="Cargo de la persona" className={inputClass} value={newMember.cargo} onChange={(event) => setNewMember((current) => ({ ...current, cargo: event.target.value }))} placeholder="Ej: Cuidadora" /></FieldLabel>
          <FieldLabel label="Función en el equipo"><select aria-label="Función en el equipo" className={inputClass} value={newMember.tipo_dotacion} onChange={(event) => setNewMember((current) => ({ ...current, tipo_dotacion: event.target.value }))}>{Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setShowAddWithoutAccess(false)} disabled={saving} className="border border-slate-200 bg-white text-slate-700">Cancelar</Button><Button type="submit" disabled={saving || !newMember.nombre.trim()} className="bg-teal-700 text-white hover:bg-teal-800">{saving ? "Guardando..." : "Agregar al equipo"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function DetailTab({ active, onClick, label, count = null }) {
  return <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition sm:text-sm ${active ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}>{label}{count !== null && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-teal-50 text-teal-700" : "bg-slate-200 text-slate-600"}`}>{count}</span>}</button>;
}

function RolePill({ role }) {
  const isAdmin = role === "admin_eleam";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAdmin ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{isAdmin ? "Administrador" : "Funcionario"}</span>;
}
