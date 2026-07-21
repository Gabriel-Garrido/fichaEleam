import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { createStaffUser, deleteStaffUser, getPendingInvitations, getTeamMembers, revokeInvitation } from "./teamService";
import { formatDateTime } from "../../utils/dateUtils";

const EMPTY_FORM = { nombre: "", email: "", telefono: "" };

export default function StaffDirectory() {
  const { eleam, profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!eleam?.id) return;
    setLoading(true);
    try {
      const [team, pending] = await Promise.all([
        getTeamMembers(eleam.id),
        getPendingInvitations(eleam.id),
      ]);
      setMembers(team);
      setInvites(pending.filter((invite) => invite.rol === "funcionario"));
    } catch (error) {
      toast(error.message || "No se pudo cargar el personal", "error");
    } finally {
      setLoading(false);
    }
  }, [eleam?.id, toast]);

  useEffect(() => { load(); }, [load]);

  const staff = useMemo(() => members.filter((member) => member.rol === "funcionario"), [members]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createStaffUser({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        rol: "funcionario",
      });
      toast(result?.email_sent === false
        ? "Usuario creado. Revisa el correo manualmente porque la invitación no pudo enviarse."
        : "Funcionario creado e invitación enviada.", result?.email_sent === false ? "warning" : "success");
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } catch (error) {
      toast(error.message || "No se pudo crear el funcionario", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member) => {
    const accepted = await confirm({
      title: "Eliminar funcionario",
      message: `Se eliminará el acceso de ${member.nombre || member.email}.`,
      confirmLabel: "Eliminar acceso",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await deleteStaffUser(member.id);
      toast("Acceso eliminado", "success");
      await load();
    } catch (error) {
      toast(error.message || "No se pudo eliminar el acceso", "error");
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
      title="Equipo del ELEAM"
      description="Crea accesos para funcionarios. Los permisos clínicos se asignan con un perfil seguro predeterminado."
      actions={<Button onClick={() => setShowCreate(true)} className="bg-teal-700 text-white hover:bg-teal-800">Agregar funcionario</Button>}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Administradores" value={members.filter((member) => member.rol === "admin_eleam").length} />
        <Stat label="Funcionarios" value={staff.length} />
        <Stat label="Invitaciones pendientes" value={invites.length} tone={invites.length ? "amber" : "teal"} />
      </div>

      {loading ? <Loading message="Cargando personal..." /> : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Personas con acceso</h2>
              <p className="mt-1 text-xs text-slate-500">El administrador mantiene acceso completo; los funcionarios reciben permisos operativos seguros.</p>
            </div>
            {members.length === 0 ? <EmptyState title="Aún no hay personal" description="Agrega el primer funcionario para comenzar." /> : (
              <div className="divide-y divide-slate-100">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{member.nombre}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${member.rol === "admin_eleam" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {member.rol === "admin_eleam" ? "Administrador" : "Funcionario"}
                        </span>
                        {member.must_reset_password && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Primer acceso pendiente</span>}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">{member.email}{member.telefono ? ` · ${member.telefono}` : ""}</p>
                    </div>
                    {member.rol === "funcionario" && member.id !== profile?.id && (
                      <button type="button" onClick={() => removeMember(member)} className="self-start text-sm font-semibold text-rose-600 hover:text-rose-700 sm:self-auto">Eliminar acceso</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

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
      )}

      <Modal isOpen={showCreate} onClose={() => !saving && setShowCreate(false)} title="Agregar funcionario">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre completo" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} required />
          <Field label="Correo" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
          <Field label="Teléfono (opcional)" value={form.telefono} onChange={(value) => setForm((current) => ({ ...current, telefono: value }))} />
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Se enviará un enlace seguro para que la persona defina su contraseña. Podrás ajustar sus permisos clínicos más adelante si realmente lo necesitas.</div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" onClick={() => setShowCreate(false)} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Cancelar</Button><Button type="submit" disabled={saving || !form.nombre.trim() || !form.email.trim()} className="bg-teal-700 text-white hover:bg-teal-800">{saving ? "Creando..." : "Crear acceso"}</Button></div>
        </form>
      </Modal>
    </PageLayout>
  );
}

function Stat({ label, value, tone = "teal" }) {
  return <div className={`rounded-2xl border p-4 ${tone === "amber" ? "border-amber-200 bg-amber-50" : "border-teal-100 bg-teal-50/60"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" /></label>;
}
