import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
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

// ─── Constantes ────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  admin_eleam: { txt: "Administrador", cls: "bg-indigo-100 text-indigo-700" },
  funcionario: { txt: "Funcionario",   cls: "bg-emerald-100 text-emerald-700" },
  familiar:    { txt: "Familiar",      cls: "bg-sky-100 text-sky-700" },
  superadmin:  { txt: "Superadmin",    cls: "bg-amber-100 text-amber-800" },
};

const PERM_GROUPS = [
  {
    label: "Residentes",
    perms: [
      { key: "crear_residentes",    label: "Crear" },
      { key: "editar_residentes",   label: "Editar" },
      { key: "eliminar_residentes", label: "Eliminar" },
    ],
  },
  {
    label: "Signos Vitales",
    perms: [
      { key: "crear_signos_vitales",    label: "Registrar" },
      { key: "editar_signos_vitales",   label: "Editar" },
      { key: "eliminar_signos_vitales", label: "Eliminar" },
    ],
  },
  {
    label: "Observaciones",
    perms: [
      { key: "crear_observaciones",    label: "Registrar" },
      { key: "editar_observaciones",   label: "Editar" },
      { key: "eliminar_observaciones", label: "Eliminar" },
    ],
  },
  {
    label: "Acreditación",
    perms: [
      { key: "subir_acreditacion",    label: "Subir documentos" },
      { key: "editar_acreditacion",   label: "Editar estado" },
      { key: "archivar_acreditacion", label: "Archivar" },
    ],
  },
  {
    label: "Visitas familiares",
    perms: [
      { key: "registrar_visitas", label: "Registrar visitas" },
    ],
  },
];

const DEFAULT_PERMS = {
  crear_residentes: true,    editar_residentes: true,    eliminar_residentes: false,
  crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
  crear_observaciones: true,  editar_observaciones: true,  eliminar_observaciones: false,
  subir_acreditacion: true,   editar_acreditacion: true,   archivar_acreditacion: false,
  registrar_visitas: true,
};

const PLANTILLAS_CARGO = {
  "Enfermero/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Kinesiólogo/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Médico/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Auxiliar ATD": {
    crear_residentes: false,  editar_residentes: false,  eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: false, eliminar_observaciones: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Administrativo/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: false, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: false, editar_observaciones: false, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: true,
    registrar_visitas: false,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
}

function RoleBadge({ rol }) {
  const r = ROLE_LABEL[rol] ?? { txt: rol, cls: "bg-gray-100 text-gray-700" };
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

  // Formulario creación
  const [createForm, setCreateForm] = useState({ nombre: "", email: "", rol: "funcionario", residenteId: "" });
  const [createdUser, setCreatedUser] = useState(null);
  const [creating, setCreating] = useState(false);

  // Permisos (modal edición existente)
  const [editedPerms, setEditedPerms] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms,  setSavingPerms]  = useState(false);

  // Permisos en modal de creación
  const [selectedCargo,   setSelectedCargo]   = useState(null);
  const [createPerms,     setCreatePerms]     = useState({ ...DEFAULT_PERMS });
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
      setMembers(m);
      setInvites(inv);
      setResidentes(res);
      setFamiliares(fam);
    } catch (e) {
      toast(e.message || "Error cargando equipo", "error");
    } finally {
      setLoading(false);
    }
  }, [eleam?.id, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── Guards ──────────────────────────────────────────────────────────────

  if (!isAdminEleam) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso restringido</h1>
        <p className="text-gray-500 mb-6">Solo el administrador del ELEAM puede gestionar el equipo.</p>
        <Button className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl"
          onClick={() => navigate("/dashboard")}>Volver al panel</Button>
      </div>
    );
  }

  if (!pagoActivo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Activa tu suscripción</h1>
        <p className="text-gray-500 mb-6">Para gestionar el equipo el ELEAM debe tener una suscripción activa.</p>
        <Button className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl"
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
      if (createForm.rol === "funcionario" && result.profile_id) {
        try { await updateFuncionarioPermisos(result.profile_id, createPerms); }
        catch { /* no bloquear: los permisos se pueden editar después */ }
      }
      setCreatedUser(result);
      toast("Usuario creado correctamente", "success");
      await refresh();
    } catch (err) {
      toast(err.message || "No se pudo crear el usuario", "error");
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
    setShowPermSection(false);
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast("Copiado al portapapeles", "success"))
      .catch(() => toast("No se pudo copiar", "error"));
  };

  // ─── Handlers: permisos ──────────────────────────────────────────────────

  const openPermModal = async (profileId) => {
    setLoadingPerms(true);
    setPermModal(profileId);
    try {
      const perms = await getFuncionarioPermisos(profileId);
      setEditedPerms(perms ? { ...DEFAULT_PERMS, ...perms } : { ...DEFAULT_PERMS });
    } catch {
      setEditedPerms({ ...DEFAULT_PERMS });
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSavePerms = async () => {
    if (!permModal) return;
    setSavingPerms(true);
    try {
      await updateFuncionarioPermisos(permModal, editedPerms);
      toast("Permisos actualizados", "success");
      setPermModal(null);
    } catch (err) {
      toast(err.message || "No se pudo guardar", "error");
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
      toast(err.message || "No se pudo eliminar", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Handlers: invitaciones legacy ───────────────────────────────────────

  const handleRevoke = async (id) => {
    try {
      await revokeInvitation(id);
      toast("Invitación eliminada", "info");
      await refresh();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  if (loading) return <Loading message="Cargando equipo..." />;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Equipo del ELEAM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea y gestiona funcionarios y familiares. Los funcionarios tienen acceso clínico; los familiares solo ven a su residente vinculado.
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-white border rounded-xl px-4 py-2 shrink-0">
          Funcionarios: <span className="font-bold">{funcionarios.length}</span>
          {maxFunc !== null && <span className="text-gray-400"> / {maxFunc}</span>}
          {" · "}
          Familiares: <span className="font-bold">{familiares.length}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "funcionarios", label: `Funcionarios (${funcionarios.length})` },
          { key: "familiares",   label: `Familiares (${familiares.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-800"
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
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Equipo del ELEAM</h2>
              <Button
                disabled={limiteAlcanzado}
                onClick={() => { setCreateForm(f => ({ ...f, rol: "funcionario" })); setCreateModal(true); }}
                className="bg-[var(--color-primary)] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
              >
                + Nuevo funcionario
              </Button>
            </div>

            {limiteAlcanzado && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Límite del plan alcanzado ({maxFunc} funcionarios). Actualiza el plan para agregar más.
              </p>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-gray-500">Sin miembros todavía.</p>
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
                        <p className="font-semibold text-gray-800 truncate">{m.nombre}</p>
                        <RoleBadge rol={m.rol} />
                        {m.must_reset_password && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Pendiente 1er acceso
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{m.email}</p>
                      <p className="text-xs text-gray-400">Creado {formatDate(m.creado_en)}</p>
                    </div>
                    {/* Acciones solo para funcionarios */}
                    {m.rol === "funcionario" && (
                      <div className="flex gap-3 items-center shrink-0">
                        <button
                          onClick={() => openPermModal(m.id)}
                          className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                        >
                          Permisos
                        </button>
                        <button
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

          {/* Invitaciones pendientes legacy */}
          {invitesFunc.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">Invitaciones pendientes</h2>
              <ul className="divide-y">
                {invitesFunc.map((inv) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-500">Expira {formatDate(inv.expira_en)}</p>
                    </div>
                    <button onClick={() => handleRevoke(inv.id)}
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
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Familiares vinculados</h2>
              <Button
                disabled={residentes.filter(r => r.estado === "activo").length === 0}
                onClick={() => { setCreateForm(f => ({ ...f, rol: "familiar" })); setCreateModal(true); }}
                className="bg-[var(--color-primary)] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
              >
                + Nuevo familiar
              </Button>
            </div>

            {residentes.filter(r => r.estado === "activo").length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Necesitas al menos un residente activo para agregar familiares.
              </p>
            )}

            {familiares.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay familiares vinculados.</p>
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
                        <p className="font-semibold text-gray-800 truncate">{row.profiles?.nombre ?? "—"}</p>
                        <RoleBadge rol="familiar" />
                        {row.profiles?.must_reset_password && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Pendiente 1er acceso
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{row.profiles?.email ?? "—"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Residente: {row.residentes?.apellido}, {row.residentes?.nombre}
                        {row.parentesco ? <> · {row.parentesco}</> : null}
                      </p>
                    </div>
                    <div className="flex gap-3 items-center shrink-0">
                      <button
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

          {/* Invitaciones familiares legacy */}
          {invitesFam.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">Invitaciones pendientes</h2>
              <ul className="divide-y">
                {invitesFam.map((inv) => {
                  const res = residentes.find((r) => r.id === inv.residente_id);
                  return (
                    <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{inv.email}</p>
                        <p className="text-xs text-gray-500">
                          {res ? <>Residente: {res.apellido}, {res.nombre} · </> : ""}
                          Expira {formatDate(inv.expira_en)}
                        </p>
                      </div>
                      <button onClick={() => handleRevoke(inv.id)}
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
              <h2 className="text-xl font-bold text-gray-800">
                {createForm.rol === "familiar" ? "Nuevo familiar" : "Nuevo funcionario"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Se generará una contraseña temporal que deberás compartir.
                El usuario la cambiará al iniciar sesión por primera vez.
              </p>
            </div>

            {/* Muestra la contraseña generada (solo una vez) */}
            {createdUser ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">
                    Guarda esta contraseña temporal — no se mostrará de nuevo
                  </p>
                  <div className="flex gap-2 items-center bg-white border border-amber-200 rounded-lg p-2">
                    <code className="flex-1 font-mono text-xl tracking-widest text-gray-800 select-all">
                      {createdUser.temp_password}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(createdUser.temp_password)}
                      className="text-[var(--color-primary)] font-semibold text-xs hover:underline shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Comparte esta contraseña con <strong>{createdUser.email}</strong>.
                    Al iniciar sesión deberá establecer una nueva.
                  </p>
                </div>
                <Button
                  onClick={closeCreateModal}
                  className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-xl font-semibold"
                >
                  Listo
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Rol selector */}
                <div>
                  <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">Rol</label>
                  <select
                    value={createForm.rol}
                    onChange={(e) => {
                      setCreateForm(f => ({ ...f, rol: e.target.value, residenteId: "" }));
                      setSelectedCargo(null);
                      setCreatePerms({ ...DEFAULT_PERMS });
                      setShowPermSection(false);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
                    disabled={creating}
                  >
                    <option value="funcionario">Funcionario (personal clínico)</option>
                    <option value="familiar">Familiar (acceso limitado al residente)</option>
                  </select>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">Nombre completo</label>
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
                  <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">Correo electrónico</label>
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
                {createForm.rol === "funcionario" && (
                  <>
                    <div>
                      <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">
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
                                : "bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600"
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
                        className="text-xs text-[var(--color-primary)] hover:underline font-medium flex items-center gap-1"
                      >
                        <span>{showPermSection ? "▼" : "▶"}</span>
                        {showPermSection ? "Ocultar permisos detallados" : "Ver y ajustar permisos detallados"}
                      </button>

                      {showPermSection && (
                        <div className="mt-3 border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                          {PERM_GROUPS.map((group) => (
                            <div key={group.label}>
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">{group.label}</p>
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
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-200"
                                    />
                                    <span className="text-xs text-gray-700">{label}</span>
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
                    <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
                      Residente vinculado
                    </label>
                    <select
                      required
                      value={createForm.residenteId}
                      onChange={(e) => setCreateForm(f => ({ ...f, residenteId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
                      disabled={creating}
                    >
                      <option value="">Selecciona un residente...</option>
                      {residentes.filter(r => r.estado === "activo").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.apellido}, {r.nombre}{r.habitacion ? ` · Hab. ${r.habitacion}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" onClick={closeCreateModal}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      creating || !createForm.nombre || !createForm.email ||
                      (createForm.rol === "familiar" && !createForm.residenteId)
                    }
                    className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
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
              <h2 className="text-xl font-bold text-gray-800">Permisos del funcionario</h2>
              <p className="text-sm text-gray-500 mt-1">
                Define qué acciones puede realizar este funcionario. Los cambios se aplican en la próxima sesión del usuario.
              </p>
            </div>

            {loadingPerms ? (
              <Loading message="Cargando permisos..." />
            ) : (
              <div className="space-y-4">
                {PERM_GROUPS.map((group) => (
                  <div key={group.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-3">{group.label}</p>
                    <div className="space-y-2">
                      {group.perms.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editedPerms[key] ?? DEFAULT_PERMS[key]}
                            onChange={(e) => setEditedPerms(p => ({ ...p, [key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-200"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
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
            )}

            <div className="flex gap-3 justify-end">
              <Button type="button" onClick={() => setPermModal(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                Cancelar
              </Button>
              <Button
                onClick={handleSavePerms}
                disabled={savingPerms || loadingPerms}
                className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
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
            <h2 className="text-xl font-bold text-gray-800">Eliminar usuario</h2>
            <p className="text-sm text-gray-600">
              ¿Estás seguro que quieres eliminar a <strong>{deleteTargetName}</strong>?
              Esta acción no se puede deshacer. El usuario perderá el acceso de inmediato.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
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
    </div>
  );
}
