import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../utils/errorMessages";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import FeaturePermissionMatrix from "../permissions/FeaturePermissionMatrix";
import { featureDefaultMap } from "../permissions/featureCatalog";
import { formatDate } from "../../utils/dateUtils";
import ExcelImportModal from "../import/ExcelImportModal";
import { staffImportConfig, normalizeStaffRows } from "../import/bulkImportConfigs";
import TeamOverview from "./TeamOverview";
import {
  getEleamFeaturePermissions,
  getProfileFeaturePermissions,
  saveProfileFeaturePermissions,
} from "../permissions/featurePermissionsService";
import {
  getTeamMembers,
  getPendingInvitations,
  revokeInvitation,
  getEleamResidentes,
  getEleamFamiliares,
  createStaffUser,
  deleteStaffUser,
  getFuncionarioPermisos,
  updateFuncionarioPermisos,
} from "./teamService";
import { ROLE_LABEL, PERM_GROUPS, DEFAULT_PERMS, PLANTILLAS_CARGO } from "./teamConstants";

// ─── Helpers ───────────────────────────────────────────────────────────────

function RoleBadge({ rol }) {
  const r = ROLE_LABEL[rol] ?? { txt: rol, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${r.cls}`}>
      {r.txt}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function TeamManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, plan, isAdminEleam, pagoActivo } = useAuth();

  const [tab, setTab] = useState("funcionarios");
  const [members,    setMembers]    = useState([]);
  const [invites,    setInvites]    = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [familiares, setFamiliares] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [createModal,    setCreateModal]    = useState(false);
  const [permModal,      setPermModal]      = useState(null);   // profileId
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);   // { id, nombre }
  const [importModal,    setImportModal]    = useState(false);

  // Formulario creación
  const [createForm, setCreateForm] = useState({ nombre: "", email: "", rol: "funcionario", residenteId: "" });
  const [createdUser, setCreatedUser] = useState(null);
  const [creating, setCreating] = useState(false);

  // Permisos (modal edición existente)
  const [editedPerms, setEditedPerms] = useState({});
  const [editedFeaturePerms, setEditedFeaturePerms] = useState({});
  const [roleFeatureLimits, setRoleFeatureLimits] = useState({});
  const [permRole, setPermRole] = useState("funcionario");
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms,  setSavingPerms]  = useState(false);

  // Permisos en modal de creación
  const [selectedCargo,   setSelectedCargo]   = useState(null);
  const [createPerms,     setCreatePerms]     = useState({ ...DEFAULT_PERMS });
  const [createFeaturePerms, setCreateFeaturePerms] = useState(featureDefaultMap("funcionario"));
  const [showPermSection, setShowPermSection] = useState(false);

  // Eliminación
  const [deleting, setDeleting] = useState(false);

  // ─── Datos ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!eleam?.id) return;
    setLoading(true);
    try {
      const [m, inv, res, fam] = await Promise.all([
        getTeamMembers(eleam.id),
        getPendingInvitations(eleam.id),
        getEleamResidentes(eleam.id),
        getEleamFamiliares(eleam.id),
      ]);
      try {
        setRoleFeatureLimits(await getEleamFeaturePermissions(eleam.id));
      } catch {
        setRoleFeatureLimits({
          funcionario: featureDefaultMap("funcionario"),
          familiar: featureDefaultMap("familiar"),
        });
      }
      setMembers(m);
      setInvites(inv);
      setResidentes(res);
      setFamiliares(fam);
    } catch (e) {
      toast(friendlyError(e, "No se pudo cargar el equipo. Recarga la página."), "error");
    } finally {
      setLoading(false);
    }
  }, [eleam?.id, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── Guards ──────────────────────────────────────────────────────────────

  if (!isAdminEleam) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Acceso restringido</h1>
        <p className="text-slate-500 mb-6">Solo el administrador del ELEAM puede gestionar el equipo.</p>
        <Button className="bg-teal-700 text-white px-6 py-2.5 rounded-xl"
          onClick={() => navigate("/dashboard")}>Volver al panel</Button>
      </div>
    );
  }

  if (!pagoActivo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Activa tu suscripción</h1>
        <p className="text-slate-500 mb-6">Para gestionar el equipo el ELEAM debe tener una suscripción activa.</p>
        <Button className="bg-teal-700 text-white px-6 py-2.5 rounded-xl"
          onClick={() => navigate("/pago")}>Activar suscripción</Button>
      </div>
    );
  }

  // ─── Datos derivados ─────────────────────────────────────────────────────

  const funcionarios    = members.filter((m) => m.rol === "funcionario");
  const admins          = members.filter((m) => m.rol === "admin_eleam");
  const invitesFunc     = invites.filter((i) => (i.rol ?? "funcionario") === "funcionario");
  const invitesFam      = invites.filter((i) => i.rol === "familiar");
  const maxFunc         = plan?.max_funcionarios ?? eleam?.max_funcionarios ?? null;
  const limiteAlcanzado = maxFunc !== null && funcionarios.length >= maxFunc;
  const deleteTargetName = deleteConfirm?.nombre || "este usuario";
  const residentesActivos = residentes.filter(r => r.estado === "activo").length;

  // ─── Handlers: creación ──────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await createStaffUser({
        nombre:      createForm.nombre.trim(),
        email:       createForm.email.trim(),
        rol:         createForm.rol,
        residenteId: createForm.rol === "familiar" ? createForm.residenteId || null : null,
      });
      // Aplicar permisos personalizados si es funcionario
      const permWarnings = [];
      if (createForm.rol === "funcionario" && result.profile_id) {
        try { await updateFuncionarioPermisos(result.profile_id, createPerms); }
        catch { permWarnings.push("permisos de módulo"); }
      }
      if ((createForm.rol === "funcionario" || createForm.rol === "familiar") && result.profile_id) {
        try { await saveProfileFeaturePermissions(result.profile_id, createForm.rol, createFeaturePerms); }
        catch { permWarnings.push("permisos de funcionalidad"); }
      }
      setCreatedUser(result);
      if (permWarnings.length > 0) {
        toast(`Usuario creado. Algunos ${permWarnings.join(" y ")} no se aplicaron; puedes editarlos desde el panel de permisos.`, "warning");
      } else {
        toast("Usuario creado correctamente", "success");
      }
      await refresh();
    } catch (err) {
      toast(friendlyError(err, "No se pudo crear el usuario. Verifica los datos e intenta de nuevo."), "error");
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    setCreatedUser(null);
    setCreateForm({ nombre: "", email: "", rol: "funcionario", residenteId: "" });
    setSelectedCargo(null);
    setCreatePerms({ ...DEFAULT_PERMS });
    setCreateFeaturePerms(featureDefaultMap("funcionario", roleFeatureLimits.funcionario));
    setShowPermSection(false);
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast("Copiado al portapapeles", "success"))
      .catch(() => toast("No se pudo copiar", "error"));
  };

  // ─── Handlers: permisos ──────────────────────────────────────────────────

  const openPermModal = async (profileId, role = "funcionario") => {
    setLoadingPerms(true);
    setPermModal(profileId);
    setPermRole(role);
    try {
      if (role === "funcionario") {
        const perms = await getFuncionarioPermisos(profileId);
        setEditedPerms(perms ? { ...DEFAULT_PERMS, ...perms } : { ...DEFAULT_PERMS });
      } else {
        setEditedPerms({});
      }
      const roleDefaults = roleFeatureLimits[role] ?? featureDefaultMap(role);
      setEditedFeaturePerms(await getProfileFeaturePermissions(profileId, role, roleDefaults));
    } catch {
      setEditedPerms({ ...DEFAULT_PERMS });
      setEditedFeaturePerms(featureDefaultMap(role, roleFeatureLimits[role]));
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSavePerms = async () => {
    if (!permModal) return;
    setSavingPerms(true);
    try {
      if (permRole === "funcionario") {
        await updateFuncionarioPermisos(permModal, editedPerms);
      }
      await saveProfileFeaturePermissions(permModal, permRole, editedFeaturePerms);
      toast("Permisos actualizados", "success");
      setPermModal(null);
    } catch (err) {
      toast(friendlyError(err, "No se pudieron guardar los permisos. Intenta de nuevo."), "error");
    } finally {
      setSavingPerms(false);
    }
  };

  // ─── Handlers: eliminación ───────────────────────────────────────────────

  const handleDelete = async () => {
    const target = deleteConfirm;
    if (!target) return;

    setDeleting(true);
    try {
      await deleteStaffUser(target.id);
      toast(`${target.nombre || "Usuario"} eliminado del equipo`, "info");
      setDeleteConfirm(null);
      await refresh();
    } catch (err) {
      toast(friendlyError(err, "No se pudo eliminar el usuario. Intenta de nuevo."), "error");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Handlers: accesos Google pendientes ─────────────────────────────────

  const handleRevoke = async (id) => {
    try {
      await revokeInvitation(id);
      toast("Invitación eliminada", "info");
      await refresh();
    } catch (e) {
      toast(friendlyError(e, "No se pudo cancelar la invitación. Intenta de nuevo."), "error");
    }
  };

  const handleImportFuncionarios = async (rows, onProgress) => {
    const results = [];
    let done = 0;

    for (const row of rows) {
      try {
        const result = await createStaffUser({
          nombre: row.payload.nombre,
          email: row.payload.email,
          rol: "funcionario",
        });

        const warnings = [];
        if (result.profile_id) {
          try {
            await updateFuncionarioPermisos(result.profile_id, row.payload.permisos);
          } catch {
            warnings.push("No se pudieron aplicar los permisos por cargo.");
          }
          try {
            await saveProfileFeaturePermissions(
              result.profile_id,
              "funcionario",
              featureDefaultMap("funcionario", roleFeatureLimits.funcionario),
            );
          } catch {
            warnings.push("No se pudieron aplicar los permisos de módulos visibles.");
          }
        } else if (result.google_only) {
          warnings.push("El usuario entrará con Google. Ajusta permisos avanzados después de su primer ingreso si el cargo requiere cambios.");
        }

        results.push({ ok: true, rowNumber: row.rowNumber, label: row.label, data: result, warnings });
      } catch (error) {
        results.push({
          ok: false,
          rowNumber: row.rowNumber,
          label: row.label,
          error: friendlyError(error, "No se pudo crear este funcionario."),
        });
      } finally {
        done += 1;
        onProgress?.(done, rows.length);
      }
    }

    return results;
  };

  const handleImportFuncionariosComplete = async (results) => {
    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;
    if (created > 0) {
      toast(`${created} funcionario${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""}${failed ? `; ${failed} fila${failed !== 1 ? "s" : ""} con error` : ""}.`, failed ? "warning" : "success");
      await refresh();
    }
  };

  const renderStaffImportDetail = (successRows) => {
    const credentialRows = successRows.filter((row) => row.data?.temp_password);
    const googleRows = successRows.filter((row) => row.data?.google_only);
    const warnings = successRows.flatMap((row) => (row.warnings ?? []).map((warning) => ({ warning, label: row.label })));
    const credentialText = credentialRows
      .map((row) => `${row.data.email}: ${row.data.temp_password}`)
      .join("\n");

    return (
      <div className="mt-4 space-y-3">
        {credentialRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-amber-900">
                Contraseñas temporales generadas. Se muestran una sola vez.
              </p>
              <button
                type="button"
                onClick={() => copyText(credentialText)}
                className="rounded-xl bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-950"
              >
                Copiar credenciales
              </button>
            </div>
            <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-amber-50 p-2">
              {credentialRows.map((row) => (
                <p key={row.rowNumber} className="font-mono text-xs text-amber-950">
                  {row.data.email}: {row.data.temp_password}
                </p>
              ))}
            </div>
          </div>
        )}

        {googleRows.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
            {googleRows.length} funcionario{googleRows.length !== 1 ? "s" : ""} con correo Gmail quedaron habilitados para ingresar con Google.
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-900">Advertencias de permisos</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {warnings.map((item, index) => (
                <li key={`${item.label}-${index}`}>{item.label}: {item.warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <Loading message="Cargando equipo..." />;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="Equipo y permisos"
      eyebrow="Gestión del ELEAM"
      description="Crea usuarios, vincula familiares y define qué módulos verá cada persona."
      size="lg"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            disabled={limiteAlcanzado}
            onClick={() => setImportModal(true)}
            className="w-full sm:w-auto bg-white text-teal-700 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-50 disabled:opacity-50"
          >
            Cargar funcionarios desde Excel
          </Button>
          <div className="text-sm text-slate-600 bg-white border rounded-xl px-4 py-2 shrink-0">
            Funcionarios: <span className="font-bold">{funcionarios.length}</span>
            {maxFunc !== null && <span className="text-slate-400"> / {maxFunc}</span>}
            {" · "}
            Familiares: <span className="font-bold">{familiares.length}</span>
          </div>
        </div>
      }
      className="space-y-6"
    >
      <ExcelImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        config={staffImportConfig}
        normalizeRows={normalizeStaffRows}
        normalizeContext={{
          existingMembers: members,
          pendingInvites: invites,
          maxFuncionarios: maxFunc,
          currentFuncionarios: funcionarios.length + invitesFunc.length,
        }}
        onImport={handleImportFuncionarios}
        onComplete={handleImportFuncionariosComplete}
        renderResultDetail={renderStaffImportDetail}
      />

      <TeamOverview
        funcionarios={funcionarios.length}
        familiares={familiares.length}
        residentesActivos={residentesActivos}
        pendingFuncionarios={invitesFunc.length}
        pendingFamiliares={invitesFam.length}
        maxFunc={maxFunc}
        limiteAlcanzado={limiteAlcanzado}
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {[
          { key: "funcionarios", label: `Funcionarios (${funcionarios.length})` },
          { key: "familiares",   label: `Familiares (${familiares.length})` },
        ].map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Funcionarios ─────────────────────────────────────────────── */}
      {tab === "funcionarios" && (
        <>
          {/* Lista de miembros */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-slate-800">Equipo del ELEAM</h2>
              <Button
                disabled={limiteAlcanzado}
                onClick={() => {
                  setCreateForm(f => ({ ...f, rol: "funcionario" }));
                  setCreateFeaturePerms(featureDefaultMap("funcionario", roleFeatureLimits.funcionario));
                  setCreateModal(true);
                }}
                className="w-full sm:w-auto bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
              >
                + Nuevo funcionario
              </Button>
            </div>

            {limiteAlcanzado && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                Límite del plan alcanzado ({maxFunc} funcionarios). Actualiza el plan para agregar más.
              </p>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-slate-500">Sin miembros todavía.</p>
            ) : (
              <ul className="divide-y">
                {[...admins, ...funcionarios].map((m) => (
                  <li key={m.id} className="py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {(m.nombre ?? m.email ?? "?")[0].toUpperCase()}
                    </div>
                    {/* Datos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 truncate">{m.nombre}</p>
                        <RoleBadge rol={m.rol} />
                        {m.must_reset_password && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Pendiente 1er acceso
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">{m.email}</p>
                      <p className="text-xs text-slate-400">Creado {formatDate(m.creado_en)}</p>
                    </div>
                    {/* Acciones solo para funcionarios */}
                    {m.rol === "funcionario" && (
                      <div className="flex gap-3 items-center shrink-0">
                        <button
                          type="button"
                          onClick={() => openPermModal(m.id, "funcionario")}
                          className="text-sm text-teal-700 hover:underline font-medium"
                        >
                          Permisos
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: m.id, nombre: m.nombre || m.email || "este usuario" })}
                          className="text-sm text-rose-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Accesos Google pendientes */}
          {invitesFunc.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-3">Invitaciones pendientes</h2>
              <ul className="divide-y">
                {invitesFunc.map((inv) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{inv.email}</p>
                      <p className="text-xs text-slate-500">Expira {formatDate(inv.expira_en)}</p>
                    </div>
                    <button type="button"
 onClick={() => handleRevoke(inv.id)}
                      className="text-rose-600 text-sm hover:underline shrink-0">Cancelar</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ── Tab Familiares ───────────────────────────────────────────────── */}
      {tab === "familiares" && (
        <>
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-slate-800">Familiares vinculados</h2>
              <Button
                disabled={residentesActivos === 0}
                onClick={() => {
                  setCreateForm(f => ({ ...f, rol: "familiar" }));
                  setCreateFeaturePerms(featureDefaultMap("familiar", roleFeatureLimits.familiar));
                  setCreateModal(true);
                }}
                className="w-full sm:w-auto bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
              >
                + Nuevo familiar
              </Button>
            </div>

            {residentesActivos === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                Necesitas al menos un residente activo para agregar familiares.
              </p>
            )}

            {familiares.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay familiares vinculados.</p>
            ) : (
              <ul className="divide-y">
                {familiares.map((row) => (
                  <li key={`${row.profile_id}-${row.residente_id}`}
                    className="py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {(row.profiles?.nombre ?? row.profiles?.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 truncate">{row.profiles?.nombre ?? "—"}</p>
                        <RoleBadge rol="familiar" />
                        {row.profiles?.must_reset_password && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Pendiente 1er acceso
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">{row.profiles?.email ?? "—"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Residente: {row.residentes?.apellido}, {row.residentes?.nombre}
                        {row.parentesco ? <> · {row.parentesco}</> : null}
                      </p>
                    </div>
                    <div className="flex gap-3 items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openPermModal(row.profile_id, "familiar")}
                        className="text-sm text-teal-700 hover:underline font-medium"
                      >
                        Permisos
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ id: row.profile_id, nombre: row.profiles?.nombre || row.profiles?.email || "este familiar" })}
                        className="text-rose-600 text-sm hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Accesos familiares Google pendientes */}
          {invitesFam.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-3">Invitaciones pendientes</h2>
              <ul className="divide-y">
                {invitesFam.map((inv) => {
                  const res = residentes.find((r) => r.id === inv.residente_id);
                  return (
                    <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{inv.email}</p>
                        <p className="text-xs text-slate-500">
                          {res ? <>Residente: {res.apellido}, {res.nombre} · </> : ""}
                          Expira {formatDate(inv.expira_en)}
                        </p>
                      </div>
                      <button type="button"
 onClick={() => handleRevoke(inv.id)}
                        className="text-rose-600 text-sm hover:underline shrink-0">Cancelar</button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Modal: Crear usuario
      ════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={createModal} onClose={closeCreateModal}>
        <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {createForm.rol === "familiar" ? "Nuevo familiar" : "Nuevo funcionario"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {createForm.email.toLowerCase().endsWith("@gmail.com")
                  ? "Correo Gmail detectado: el usuario podrá iniciar sesión directamente con Google, sin necesidad de contraseña."
                  : "Se generará una contraseña temporal y se intentará enviarla por correo. El usuario la cambiará al iniciar sesión por primera vez."}
              </p>
            </div>

            {/* Resultado de creación */}
            {createdUser ? (
              <div className="space-y-4">
                {createdUser.google_only ? (
                  /* ── Gmail/Google: sin contraseña ── */
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-semibold text-emerald-800">
                        Acceso con Google habilitado
                      </p>
                    </div>
                    <p className="text-xs text-emerald-700">
                      <strong>{createdUser.email}</strong> puede iniciar sesión directamente con Google.
                      No necesita contraseña temporal.
                    </p>
                    {createdUser.email_sent ? (
                      <p className="text-xs text-emerald-600">
                        Se envió un correo de bienvenida con las instrucciones.
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                        No se pudo enviar el correo automáticamente. Informa al usuario que puede entrar en{" "}
                        <strong>fichaeleam.cl/login</strong> usando el botón de Google con su correo.
                      </p>
                    )}
                  </div>
                ) : (
                  /* ── Correo estándar: contraseña temporal ── */
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      Guarda esta contraseña temporal — no se mostrará de nuevo
                    </p>
                    <div className="flex gap-2 items-center bg-white border border-amber-200 rounded-xl p-2">
                      <code className="flex-1 font-mono text-xl tracking-widest text-slate-800 select-all">
                        {createdUser.temp_password}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText(createdUser.temp_password)}
                        className="text-teal-700 font-semibold text-xs hover:underline shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      {createdUser.email_sent
                        ? `También enviamos estas credenciales a ${createdUser.email}.`
                        : `Comparte esta contraseña con ${createdUser.email}.`}
                      Al iniciar sesión deberá establecer una nueva.
                    </p>
                    {!createdUser.email_sent && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mt-2">
                        <p className="text-xs font-semibold text-amber-800">Correo no enviado automáticamente</p>
                        <p className="mt-1 text-xs text-amber-700">
                          {createdUser.email_error
                            ? `Motivo: ${createdUser.email_error}`
                            : "Comparte las credenciales manualmente y revisa la configuración de Resend."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  onClick={closeCreateModal}
                  className="w-full bg-teal-700 text-white py-2.5 rounded-xl font-semibold"
                >
                  Listo
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Rol selector */}
                <div>
                  <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">Rol</label>
                  <select
                    value={createForm.rol}
                    onChange={(e) => {
                      setCreateForm(f => ({ ...f, rol: e.target.value, residenteId: "" }));
                      setSelectedCargo(null);
                      setCreatePerms({ ...DEFAULT_PERMS });
                      setCreateFeaturePerms(featureDefaultMap(e.target.value, roleFeatureLimits[e.target.value]));
                      setShowPermSection(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
                    disabled={creating}
                  >
                    <option value="funcionario">Funcionario (personal clínico)</option>
                    <option value="familiar">Familiar (acceso limitado al residente)</option>
                  </select>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">Nombre completo</label>
                  <Input
                    required
                    placeholder="Juan Pérez"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm(f => ({ ...f, nombre: e.target.value }))}
                    disabled={creating}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">Correo electrónico</label>
                  <Input
                    type="email"
                    required
                    placeholder="usuario@correo.cl"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    disabled={creating}
                  />
                </div>

                {/* Cargo y permisos (solo funcionario) */}
                {(createForm.rol === "funcionario" || createForm.rol === "familiar") && (
                  <FeaturePermissionMatrix
                    role={createForm.rol}
                    value={createFeaturePerms}
                    onChange={setCreateFeaturePerms}
                    lockedByRole={roleFeatureLimits[createForm.rol] ?? featureDefaultMap(createForm.rol)}
                    title="Features visibles al iniciar"
                    description="Solo aparecen features permitidas por superadmin para este ELEAM."
                  />
                )}

                {/* Cargo y permisos (solo funcionario) */}
                {createForm.rol === "funcionario" && (
                  <>
                    <div>
                      <label className="text-xs uppercase font-semibold text-slate-500 mb-2 block">
                        Cargo (define los permisos iniciales)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(PLANTILLAS_CARGO).map((cargo) => (
                          <button
                            key={cargo}
                            type="button"
                            onClick={() => {
                              setSelectedCargo(cargo);
                              setCreatePerms({ ...PLANTILLAS_CARGO[cargo] });
                            }}
                            disabled={creating}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              selectedCargo === cargo
                                ? "bg-teal-600 text-white border-teal-600"
                                : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-600"
                            }`}
                          >
                            {cargo}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPermSection((v) => !v)}
                        disabled={creating}
                        className="text-xs text-teal-700 hover:underline font-medium flex items-center gap-1"
                      >
                        <span>{showPermSection ? "▼" : "▶"}</span>
                        {showPermSection ? "Ocultar permisos detallados" : "Ver y ajustar permisos detallados"}
                      </button>

                      {showPermSection && (
                        <div className="mt-3 border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
                          {PERM_GROUPS.map((group) => (
                            <div key={group.label}>
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">{group.label}</p>
                              <div className="space-y-1.5">
                                {group.perms.map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={createPerms[key] ?? DEFAULT_PERMS[key]}
                                      onChange={(e) =>
                                        setCreatePerms((p) => ({ ...p, [key]: e.target.checked }))
                                      }
                                      disabled={creating}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
                                    />
                                    <span className="text-xs text-slate-700">{label}</span>
                                    {(key.startsWith("eliminar_") || key === "archivar_acreditacion") && (
                                      <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-200 rounded px-1">
                                        destructivo
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Residente (solo familiar) */}
                {createForm.rol === "familiar" && (
                  <div>
                    <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
                      Residente vinculado
                    </label>
                    <select
                      required
                      value={createForm.residenteId}
                      onChange={(e) => setCreateForm(f => ({ ...f, residenteId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
                      disabled={creating}
                    >
                      <option value="">Selecciona un residente...</option>
                      {residentes.filter(r => r.estado === "activo").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.apellido}, {r.nombre}{r.ubicacion_label ? ` · ${r.ubicacion_label}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" onClick={closeCreateModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      creating || !createForm.nombre || !createForm.email ||
                      (createForm.rol === "familiar" && !createForm.residenteId)
                    }
                    className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 disabled:opacity-50"
                  >
                    {creating ? "Creando..." : "Crear usuario"}
                  </Button>
                </div>
              </form>
            )}
          </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          Modal: Permisos del funcionario
      ════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!permModal} onClose={() => setPermModal(null)}>
        <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Permisos del {permRole === "familiar" ? "familiar" : "funcionario"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Define qué módulos verá en el sidebar. Los cambios se aplican en la próxima sesión del usuario.
              </p>
            </div>

            {loadingPerms ? (
              <Loading message="Cargando permisos..." />
            ) : (
              <div className="space-y-4">
                <FeaturePermissionMatrix
                  role={permRole}
                  value={editedFeaturePerms}
                  onChange={setEditedFeaturePerms}
                  lockedByRole={roleFeatureLimits[permRole] ?? featureDefaultMap(permRole)}
                  title="Features del sidebar"
                  description="Si una feature está bloqueada por superadmin, no puede habilitarse desde el ELEAM."
                />

                {permRole === "funcionario" && (
                  <details className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                      Permisos avanzados de acciones
                    </summary>
                    <div className="mt-4 space-y-4">
                      {PERM_GROUPS.map((group) => (
                        <div key={group.label} className="bg-white rounded-xl p-4">
                          <p className="text-xs uppercase font-bold text-slate-500 mb-3">{group.label}</p>
                          <div className="space-y-2">
                            {group.perms.map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editedPerms[key] ?? DEFAULT_PERMS[key]}
                                  onChange={(e) => setEditedPerms(p => ({ ...p, [key]: e.target.checked }))}
                                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
                                />
                                <span className="text-sm text-slate-700">{label}</span>
                                {(key.startsWith("eliminar_") || key === "archivar_acreditacion") && (
                                  <span className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded px-1.5">
                                    acción destructiva
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button type="button" onClick={() => setPermModal(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancelar
              </Button>
              <Button
                onClick={handleSavePerms}
                disabled={savingPerms || loadingPerms}
                className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 disabled:opacity-50"
              >
                {savingPerms ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          Modal: Confirmar eliminación
      ════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)}>
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Eliminar usuario</h2>
            <p className="text-sm text-slate-600">
              ¿Estás seguro que quieres eliminar a <strong>{deleteTargetName}</strong>?
              Esta acción no se puede deshacer. El usuario perderá el acceso de inmediato.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Confirmar eliminación"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
