import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { createStaffUser, deactivateTeamUser, getPendingInvitations, getTeamMembers, getUserAccessHistory, restoreTeamUser, revokeInvitation, saveStaffMemberDetails, updateFuncionarioPermisos, updateProfileFeaturePermissions } from "./teamService";
import { formatDateTime } from "../../utils/dateUtils";
import PersonnelNav from "../personnel/PersonnelNav";
import StaffCompetenciesTab from "../ds20/StaffCompetenciesTab";
import StaffPermissionsModal from "./StaffPermissionsModal";
import { DEFAULT_PERMS, defaultPermissionsForFunction } from "./teamConstants";
import { FEATURE_CATALOG } from "../permissions/featureCatalog";
import { TIPO_DOTACION_LABEL } from "../ds20/staffingService";
import { friendlyError } from "../../utils/errorMessages";

const EMPTY_FORM = { nombre: "", email: "", telefono: "", cargo: "", tipo_dotacion: "", rol: "funcionario", adminAcknowledged: false };

export default function StaffDirectory() {
  const { eleam, profile, isAdminEleam } = useAuth();
  const canManage = isAdminEleam;
  const toast = useToast();
  const confirm = useConfirm();
  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadWarning, setLoadWarning] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newPermissions, setNewPermissions] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateAcknowledged, setDeactivateAcknowledged] = useState(false);
  const [directoryVersion, setDirectoryVersion] = useState(0);

  const load = useCallback(async () => {
    if (!eleam?.id || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    setLoadWarning("");
    try {
      const [pendingResult, membersResult, historyResult] = await Promise.allSettled([
        getPendingInvitations(eleam.id),
        getTeamMembers(eleam.id),
        getUserAccessHistory(eleam.id),
      ]);
      if (membersResult.status === "rejected") throw membersResult.reason;
      setMembers(membersResult.value);
      setInvites(pendingResult.status === "fulfilled" ? pendingResult.value : []);
      setAccessHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      if (pendingResult.status === "rejected" || historyResult.status === "rejected") {
        setLoadWarning("El directorio está disponible, pero no pudimos comprobar temporalmente todas las invitaciones o movimientos de acceso.");
      }
    } catch (error) {
      setLoadError(friendlyError(error, "No se pudo cargar el directorio del equipo."));
    } finally {
      setLoading(false);
    }
  }, [canManage, eleam?.id]);

  useEffect(() => { load(); }, [load]);

  const closeCreate = () => {
    if (saving) return;
    setShowCreate(false);
    setCreateStep(1);
    setForm(EMPTY_FORM);
    setNewPermissions(null);
  };

  const submit = async (event, permissionsOverride = null) => {
    event?.preventDefault();
    const isAdmin = form.rol === "admin_eleam";
    setSaving(true);
    try {
      const selectedPermissions = permissionsOverride ?? newPermissions;
      const result = await createStaffUser({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        rol: form.rol,
      });
      const profileId = result?.profile_id;
      if (!profileId) throw new Error("La cuenta fue creada, pero no se pudo identificar correctamente.");
      if (!isAdmin) {
        const deniedActions = Object.fromEntries(Object.keys(DEFAULT_PERMS).map((key) => [key, false]));
        const deniedAreas = Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.id, false]));
        await Promise.all([
          updateFuncionarioPermisos(profileId, { ...deniedActions, ...(selectedPermissions?.actions ?? {}) }),
          updateProfileFeaturePermissions(profileId, { ...deniedAreas, ...(selectedPermissions?.areas ?? {}) }),
          saveStaffMemberDetails(profileId, {
            nombre: form.nombre.trim(),
            email: form.email.trim().toLowerCase(),
            telefono: form.telefono.trim() || null,
            cargo: form.cargo.trim() || null,
            tipo_dotacion: form.tipo_dotacion,
          }),
        ]);
      }
      const googleAccess = result?.access_method === "google";
      toast(result?.email_sent === false
        ? googleAccess
          ? `${isAdmin ? "Administrador" : "Funcionario"} creado. Puede ingresar en fichaeleam.cl con “Continuar con Google”.`
          : `${isAdmin ? "Administrador" : "Funcionario"} creado. No se pudo enviar el correo; puede usar “¿Olvidaste tu contraseña?”.`
        : googleAccess
          ? `${isAdmin ? "Administrador" : "Funcionario"} creado. Se enviaron instrucciones para ingresar con Google.`
          : `${isAdmin ? "Administrador" : "Funcionario"} creado. Se envió el enlace de activación.`, result?.email_sent === false ? "warning" : "success");
      setForm(EMPTY_FORM);
      setNewPermissions(null);
      setCreateStep(1);
      setShowCreate(false);
      await load();
      setDirectoryVersion((version) => version + 1);
    } catch (error) {
      toast(error.message || "No se pudo crear el usuario", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (invite) => {
    const accepted = await confirm({
      title: "Cancelar invitación",
      message: `Se cancelará la invitación enviada a ${invite.email}.`,
      confirmLabel: "Cancelar invitación",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await revokeInvitation(invite.id);
      toast("Invitación cancelada", "success");
      await load();
      setDirectoryVersion((version) => version + 1);
    } catch (error) {
      toast(error.message || "No se pudo cancelar la invitación", "error");
    }
  };

  const deactivateUser = async (event) => {
    event.preventDefault();
    if (!deactivateTarget || deactivateReason.trim().length < 3 || !deactivateAcknowledged) return;
    setSaving(true);
    try {
      await deactivateTeamUser(deactivateTarget.id, deactivateReason.trim());
      toast(`Acceso de ${deactivateTarget.nombre || deactivateTarget.email} desactivado. Su historial fue conservado.`, "success");
      setDeactivateTarget(null);
      setDeactivateReason("");
      setDeactivateAcknowledged(false);
      await load();
      setDirectoryVersion((version) => version + 1);
    } catch (error) {
      toast(error.message || "No se pudo desactivar el usuario", "error");
    } finally {
      setSaving(false);
    }
  };

  const restoreUser = async (member) => {
    const accepted = await confirm({
      title: "Restaurar acceso",
      message: `${member.nombre || member.email} podrá volver a ingresar con su cuenta y recuperará los permisos que tenía antes de la desactivación.`,
      confirmLabel: "Restaurar acceso",
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await restoreTeamUser(member.id);
      toast(`Acceso de ${member.nombre || member.email} restaurado.`, "success");
      await load();
      setDirectoryVersion((version) => version + 1);
    } catch (error) {
      toast(error.message || "No se pudo restaurar el usuario", "error");
    } finally {
      setSaving(false);
    }
  };

  const latestHistoryFor = (profileId, action) => accessHistory.find((item) => item.profile_id === profileId && (!action || item.accion === action));

  return (
    <PageLayout
      eyebrow="Personal"
      title="Equipo"
      description="Agrega personas y mantén al día su información, cursos y permisos."
    >
      <PersonnelNav />
      {canManage && (loading ? <Loading message="Cargando accesos del equipo..." /> : loadError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p className="font-semibold">No pudimos cargar los accesos</p><p className="mt-1">{loadError}</p><Button type="button" onClick={load} className="mt-3 border border-rose-200 bg-white text-rose-700">Reintentar</Button></div>
      ) : (
        <div className="space-y-3">
          {loadWarning && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{loadWarning}</div>}
          {members.some((member) => member.acceso_activo === false) && <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"><span>Accesos desactivados</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{members.filter((member) => member.acceso_activo === false).length}</span></summary>
            <div className="divide-y divide-slate-100 border-t border-slate-100">{members.filter((member) => member.acceso_activo === false).map((member) => {
              const event = latestHistoryFor(member.id, "desactivado");
              return <div key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-slate-900">{member.nombre || member.email}</p><p className="mt-1 text-xs leading-5 text-slate-600">Desactivado {formatDateTime(member.desactivado_en)}{event?.autor?.nombre ? ` por ${event.autor.nombre}` : ""} · {member.motivo_desactivacion || event?.motivo || "Motivo no informado"}</p></div><Button type="button" onClick={() => restoreUser(member)} disabled={saving} className="shrink-0 border border-teal-200 bg-white text-teal-800 hover:bg-teal-50">Restaurar</Button></div>;
            })}</div>
          </details>}
          {invites.length > 0 && (
            <details className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-amber-950"><span>Invitaciones pendientes</span><span className="rounded-full bg-white px-2.5 py-1 text-xs">{invites.length}</span></summary>
              <div className="divide-y divide-amber-100">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div><p className="font-medium text-slate-900">{invite.nombre || invite.email}</p><p className="text-xs text-slate-500">{invite.rol === "admin_eleam" ? "Administrador" : "Funcionario"} · {invite.email} · vence {formatDateTime(invite.expira_en)}</p></div>
                    <button type="button" onClick={() => cancelInvite(invite)} className="text-sm font-semibold text-rose-600">Cancelar</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}

      <section className="mt-5">
        <StaffCompetenciesTab
          onAddWithAccess={canManage ? () => setShowCreate(true) : null}
          currentProfileId={profile?.id}
          refreshKey={directoryVersion}
          onDeactivateAccess={canManage ? (staffMember) => {
            const member = members.find((item) => item.id === staffMember.profile_id);
            if (!member) return;
            setDeactivateTarget(member);
            setDeactivateReason("");
            setDeactivateAcknowledged(false);
          } : null}
          onRestoreAccess={canManage ? (staffMember) => {
            const member = members.find((item) => item.id === staffMember.profile_id);
            if (member) restoreUser(member);
          } : null}
        />
      </section>

      <Modal isOpen={canManage && Boolean(deactivateTarget)} onClose={() => { if (!saving) { setDeactivateTarget(null); setDeactivateReason(""); setDeactivateAcknowledged(false); } }} title="Desactivar acceso del usuario">
        <form onSubmit={deactivateUser} className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"><p className="font-bold">{deactivateTarget?.nombre || deactivateTarget?.email} dejará de ingresar inmediatamente</p><p className="mt-1">Su cuenta no se borrará. Conservaremos sus permisos, cursos, documentos y registros realizados para mantener la trazabilidad.</p>{deactivateTarget?.rol === "admin_eleam" && <p className="mt-2 font-semibold">Esta persona tiene acceso administrativo completo. Verificaremos que quede otro administrador activo.</p>}</div>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Motivo de la desactivación</span><textarea value={deactivateReason} onChange={(event) => setDeactivateReason(event.target.value)} required minLength={3} maxLength={500} rows={3} placeholder="Ej: Término de relación laboral" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" /><span className="mt-1 block text-xs text-slate-500">Quedará registrado en el historial de seguridad.</span></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={deactivateAcknowledged} onChange={(event) => setDeactivateAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-rose-700" /><span>Confirmo que esta persona ya no debe tener acceso a la información del ELEAM.</span></label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => { setDeactivateTarget(null); setDeactivateReason(""); setDeactivateAcknowledged(false); }} disabled={saving} className="border border-slate-200 bg-white text-slate-700">Cancelar</Button><Button type="submit" disabled={saving || deactivateReason.trim().length < 3 || !deactivateAcknowledged} className="bg-rose-700 text-white hover:bg-rose-800">{saving ? "Desactivando..." : "Desactivar acceso"}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={canManage && showCreate} onClose={closeCreate} title="Agregar usuario con acceso" panelClassName={createStep === 2 ? "max-w-4xl p-4 sm:p-6" : "max-w-lg p-4 sm:p-6"}>
        {form.rol === "funcionario" && <WizardProgress step={createStep} />}
        {createStep === 1 ? <form onSubmit={(event) => form.rol === "admin_eleam" ? submit(event) : (event.preventDefault(), setCreateStep(2))} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Tipo de acceso</span><select value={form.rol} onChange={(event) => {
            const rol = event.target.value;
            setForm((current) => ({ ...current, rol, adminAcknowledged: false }));
            setCreateStep(1);
          }} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"><option value="funcionario">Funcionario con permisos configurables</option><option value="admin_eleam">Administrador del ELEAM</option></select></label>
          <Field label="Nombre completo" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} required />
          <Field label="Correo" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
          {/@gmail\.com$/i.test(form.email.trim()) && <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">Esta persona ingresará con <strong>Continuar con Google</strong>. No tendrá que crear otra contraseña.</p>}
          <Field label="Teléfono (opcional)" value={form.telefono} onChange={(value) => setForm((current) => ({ ...current, telefono: value }))} />
          {form.rol === "funcionario" ? <><Field label="Cargo" value={form.cargo} onChange={(value) => setForm((current) => ({ ...current, cargo: value }))} placeholder="Ej: TENS de turno" required />
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Función en el equipo</span><select value={form.tipo_dotacion} onChange={(event) => {
            const tipo = event.target.value;
            setForm((current) => ({ ...current, tipo_dotacion: tipo }));
            setNewPermissions(tipo ? defaultPermissionsForFunction(tipo) : null);
          }} required className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"><option value="">Selecciona una función</option>{Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1.5 block text-xs leading-5 text-slate-500">Al elegirla, prepararemos automáticamente los permisos recomendados.</span></label>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">Al continuar podrás revisar los permisos recomendados para la función elegida antes de crear la cuenta.</div></> : <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"><p className="font-bold">Esta cuenta tendrá control total del ELEAM</p><p>Podrá ver y modificar datos clínicos, documentos, residentes, personal, pagos, configuración y crear otros usuarios. Los permisos de un administrador no pueden limitarse individualmente.</p><label className="flex items-start gap-3 rounded-lg bg-white/70 p-3 font-semibold"><input type="checkbox" checked={form.adminAcknowledged} onChange={(event) => setForm((current) => ({ ...current, adminAcknowledged: event.target.checked }))} className="mt-1 h-4 w-4 accent-rose-700" /><span>Confirmo que esta persona está autorizada para administrar el ELEAM y que usará una cuenta individual.</span></label></div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" onClick={closeCreate} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Cancelar</Button><Button type="submit" disabled={saving || !form.nombre.trim() || !form.email.trim() || (form.rol === "funcionario" ? !form.cargo.trim() || !form.tipo_dotacion : !form.adminAcknowledged)} className={form.rol === "admin_eleam" ? "bg-rose-700 text-white hover:bg-rose-800" : "bg-teal-700 text-white hover:bg-teal-800"}>{saving ? "Creando..." : form.rol === "admin_eleam" ? "Crear administrador" : "Continuar a permisos"}</Button></div>
        </form> : <StaffPermissionsModal
          member={{ nombre: form.nombre.trim() }}
          isOpen
          onClose={closeCreate}
          initialPermissions={newPermissions}
          onApply={(permissions) => submit(null, permissions)}
          onDraftChange={setNewPermissions}
          embedded
          primaryLabel="Finalizar y enviar invitación"
          secondaryLabel="Volver"
          onSecondary={() => setCreateStep(1)}
          externalSaving={saving}
        />}
      </Modal>
    </PageLayout>
  );
}

function WizardProgress({ step }) {
  return <div className="mb-5" aria-label={`Paso ${step} de 2`}><div className="mb-2 flex items-center justify-between text-xs font-semibold"><span className={step === 1 ? "text-teal-700" : "text-slate-500"}>1. Datos</span><span className={step === 2 ? "text-teal-700" : "text-slate-500"}>2. Permisos</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>;
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" /></label>;
}
