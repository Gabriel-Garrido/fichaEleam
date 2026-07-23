import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { createStaffUser, getPendingInvitations, revokeInvitation, saveStaffMemberDetails, updateFuncionarioPermisos, updateProfileFeaturePermissions } from "./teamService";
import { formatDateTime } from "../../utils/dateUtils";
import PersonnelNav from "../personnel/PersonnelNav";
import StaffCompetenciesTab from "../ds20/StaffCompetenciesTab";
import StaffPermissionsModal from "./StaffPermissionsModal";
import { DEFAULT_PERMS, defaultPermissionsForFunction } from "./teamConstants";
import { FEATURE_CATALOG } from "../permissions/featureCatalog";
import { TIPO_DOTACION_LABEL } from "../ds20/staffingService";

const EMPTY_FORM = { nombre: "", email: "", telefono: "", cargo: "", tipo_dotacion: "" };

export default function StaffDirectory() {
  const { eleam, isAdminEleam } = useAuth();
  const canManage = isAdminEleam;
  const toast = useToast();
  const confirm = useConfirm();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newPermissions, setNewPermissions] = useState(null);

  const load = useCallback(async () => {
    if (!eleam?.id || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const pending = await getPendingInvitations(eleam.id);
      setInvites(pending.filter((invite) => invite.rol === "funcionario"));
    } catch (error) {
      toast(error.message || "No se pudo cargar el personal", "error");
    } finally {
      setLoading(false);
    }
  }, [canManage, eleam?.id, toast]);

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
    setSaving(true);
    try {
      const selectedPermissions = permissionsOverride ?? newPermissions;
      const result = await createStaffUser({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        rol: "funcionario",
      });
      const profileId = result?.profile_id;
      if (!profileId) throw new Error("La cuenta fue creada, pero no se pudo identificar para asignar sus permisos.");
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
      toast(result?.email_sent === false
        ? "Usuario creado. Revisa el correo manualmente porque la invitación no pudo enviarse."
        : "Funcionario creado e invitación enviada.", result?.email_sent === false ? "warning" : "success");
      setForm(EMPTY_FORM);
      setNewPermissions(null);
      setCreateStep(1);
      setShowCreate(false);
      await load();
    } catch (error) {
      toast(error.message || "No se pudo crear el funcionario", "error");
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
    } catch (error) {
      toast(error.message || "No se pudo cancelar la invitación", "error");
    }
  };

  return (
    <PageLayout
      eyebrow="Personal"
      title="Equipo"
      description="Agrega personas y mantén al día su información, cursos y permisos."
    >
      <PersonnelNav />
      {canManage && (loading ? <Loading message="Cargando personal..." /> : (
        <div className="space-y-5">
          {invites.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50">
              <div className="border-b border-amber-100 px-5 py-4"><h2 className="font-semibold text-amber-950">Invitaciones pendientes</h2></div>
              <div className="divide-y divide-amber-100">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div><p className="font-medium text-slate-900">{invite.nombre || invite.email}</p><p className="text-xs text-slate-500">{invite.email} · vence {formatDateTime(invite.expira_en)}</p></div>
                    <button type="button" onClick={() => cancelInvite(invite)} className="text-sm font-semibold text-rose-600">Cancelar</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ))}

      <section className="mt-6 border-t border-slate-200 pt-6">
        <StaffCompetenciesTab onAddWithAccess={canManage ? () => setShowCreate(true) : null} />
      </section>

      <Modal isOpen={canManage && showCreate} onClose={closeCreate} title="Agregar funcionario con acceso" panelClassName={createStep === 2 ? "max-w-4xl p-4 sm:p-6" : "max-w-lg p-4 sm:p-6"}>
        <WizardProgress step={createStep} />
        {createStep === 1 ? <form onSubmit={(event) => { event.preventDefault(); setCreateStep(2); }} className="space-y-4">
          <Field label="Nombre completo" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} required />
          <Field label="Correo" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
          <Field label="Teléfono (opcional)" value={form.telefono} onChange={(value) => setForm((current) => ({ ...current, telefono: value }))} />
          <Field label="Cargo" value={form.cargo} onChange={(value) => setForm((current) => ({ ...current, cargo: value }))} placeholder="Ej: TENS de turno" required />
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Función en el equipo</span><select value={form.tipo_dotacion} onChange={(event) => {
            const tipo = event.target.value;
            setForm((current) => ({ ...current, tipo_dotacion: tipo }));
            setNewPermissions(tipo ? defaultPermissionsForFunction(tipo) : null);
          }} required className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"><option value="">Selecciona una función</option>{Object.entries(TIPO_DOTACION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1.5 block text-xs leading-5 text-slate-500">Al elegirla, prepararemos automáticamente los permisos recomendados.</span></label>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">Al continuar podrás revisar los permisos recomendados para la función elegida antes de crear la cuenta.</div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" onClick={closeCreate} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Cancelar</Button><Button type="submit" disabled={saving || !form.nombre.trim() || !form.email.trim() || !form.cargo.trim() || !form.tipo_dotacion} className="bg-teal-700 text-white hover:bg-teal-800">Continuar a permisos</Button></div>
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
