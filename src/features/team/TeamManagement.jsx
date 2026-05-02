import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import {
  getTeamMembers,
  getPendingInvitations,
  inviteMember,
  revokeInvitation,
  getEleamResidentes,
  getEleamFamiliares,
  unlinkFamiliarResidente,
} from "./teamService";

const ROLE_LABEL = {
  admin_eleam: { txt: "Administrador", cls: "bg-indigo-100 text-indigo-700" },
  funcionario: { txt: "Funcionario", cls: "bg-emerald-100 text-emerald-700" },
  familiar:    { txt: "Familiar",    cls: "bg-sky-100 text-sky-700" },
  superadmin:  { txt: "Superadmin",  cls: "bg-amber-100 text-amber-800" },
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
}

export default function TeamManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, plan, isAdminEleam, pagoActivo } = useAuth();

  const [tab,        setTab]        = useState("funcionarios"); // 'funcionarios' | 'familiares'
  const [members,    setMembers]    = useState([]);
  const [invites,    setInvites]    = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [familiares, setFamiliares] = useState([]);
  const [loading,    setLoading]    = useState(true);

  // Form state
  const [email,       setEmail]       = useState("");
  const [residenteId, setResidenteId] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [lastInvite,  setLastInvite]  = useState(null);

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

  if (!isAdminEleam) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso restringido</h1>
        <p className="text-gray-500 mb-6">Solo el administrador del ELEAM puede gestionar el equipo.</p>
        <Button
          className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl"
          onClick={() => navigate("/dashboard")}
        >
          Volver al panel
        </Button>
      </div>
    );
  }

  if (!pagoActivo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Activa tu suscripción</h1>
        <p className="text-gray-500 mb-6">
          Para invitar funcionarios o familiares, primero el ELEAM debe tener una suscripción activa.
        </p>
        <Button
          className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl"
          onClick={() => navigate("/pago")}
        >
          Activar suscripción
        </Button>
      </div>
    );
  }

  const funcionarios     = members.filter((m) => m.rol === "funcionario");
  const admins           = members.filter((m) => m.rol === "admin_eleam");
  const invitesFunc      = invites.filter((i) => (i.rol ?? "funcionario") === "funcionario");
  const invitesFam       = invites.filter((i) => i.rol === "familiar");
  const maxFunc          = plan?.max_funcionarios ?? eleam?.max_funcionarios ?? null;
  const cuposFuncOcupados = funcionarios.length + invitesFunc.length;
  const limiteAlcanzado  = maxFunc !== null && cuposFuncOcupados >= maxFunc;

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLastInvite(null);
    try {
      const res = await inviteMember({
        email: email.trim(),
        rol: tab === "familiares" ? "familiar" : "funcionario",
        residenteId: tab === "familiares" ? residenteId || null : null,
      });
      setLastInvite(res);
      setEmail("");
      setResidenteId("");
      toast("Invitación creada", "success");
      await refresh();
    } catch (err) {
      toast(err.message || "No se pudo crear la invitación", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("¿Eliminar esta invitación?")) return;
    try {
      await revokeInvitation(id);
      toast("Invitación eliminada", "info");
      await refresh();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  const handleUnlink = async (profileId, residenteId, nombre) => {
    if (!window.confirm(`Quitar el acceso de ${nombre} al residente?`)) return;
    try {
      await unlinkFamiliarResidente(profileId, residenteId);
      toast("Vínculo eliminado", "info");
      await refresh();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast("Copiado al portapapeles", "success"))
      .catch(() => toast("No se pudo copiar", "error"));
  };

  if (loading) return <Loading message="Cargando equipo..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Equipo del ELEAM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Funcionarios trabajan en el ELEAM. Familiares acceden de forma limitada
            al residente que les vinculaste.
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-white border rounded-xl px-4 py-2">
          Funcionarios: <span className="font-bold">{funcionarios.length}</span>
          {maxFunc !== null && <span className="text-gray-400"> / {maxFunc} (plan)</span>}
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
            onClick={() => { setTab(t.key); setLastInvite(null); setEmail(""); setResidenteId(""); }}
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

      {/* Form invitación */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-3">
          Invitar {tab === "familiares" ? "familiar" : "funcionario"}
        </h2>

        {tab === "funcionarios" && limiteAlcanzado && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            Llegaste al máximo de funcionarios del plan. Cancela una invitación
            pendiente o actualiza el plan para sumar más.
          </p>
        )}

        {tab === "familiares" && residentes.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            Necesitas crear un residente antes de poder invitar familiares.
          </p>
        )}

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Correo del {tab === "familiares" ? "familiar" : "funcionario"}
            </label>
            <Input
              type="email"
              required
              placeholder={tab === "familiares" ? "familia@correo.cl" : "funcionario@correo.cl"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={
                submitting ||
                (tab === "funcionarios" && limiteAlcanzado) ||
                (tab === "familiares" && residentes.length === 0)
              }
            />
          </div>

          {tab === "familiares" && (
            <div>
              <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
                Residente vinculado
              </label>
              <select
                required
                value={residenteId}
                onChange={(e) => setResidenteId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
                disabled={submitting || residentes.length === 0}
              >
                <option value="">Selecciona un residente...</option>
                {residentes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.apellido}, {r.nombre}
                    {r.habitacion ? ` · Hab. ${r.habitacion}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`${tab === "familiares" ? "sm:col-span-2" : ""} text-right`}>
            <Button
              type="submit"
              disabled={
                submitting ||
                !email ||
                (tab === "funcionarios" && limiteAlcanzado) ||
                (tab === "familiares" && (!residenteId || residentes.length === 0))
              }
              className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
            >
              {submitting ? "Generando..." : "Invitar"}
            </Button>
          </div>
        </form>

        {lastInvite?.invite_url && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-semibold mb-2">
              Invitación lista — comparte este link con {lastInvite.email}
            </p>
            <div className="flex gap-2 items-center bg-white border rounded-lg p-2 text-xs text-gray-700">
              <code className="flex-1 truncate">{lastInvite.invite_url}</code>
              <button
                type="button"
                className="text-[var(--color-primary)] font-semibold text-xs hover:underline"
                onClick={() => copy(lastInvite.invite_url)}
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              El link expira en 7 días. {lastInvite.email} debe registrarse usando exactamente ese correo.
            </p>
          </div>
        )}
      </section>

      {/* Listado funcionarios */}
      {tab === "funcionarios" && (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-3">Equipo del ELEAM</h2>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">Sin miembros todavía.</p>
            ) : (
              <ul className="divide-y">
                {[...admins, ...funcionarios].map((m) => {
                  const role = ROLE_LABEL[m.rol] ?? { txt: m.rol, cls: "bg-gray-100 text-gray-700" };
                  return (
                    <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{m.nombre}</p>
                        <p className="text-sm text-gray-500 truncate">{m.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${role.cls}`}>
                        {role.txt}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {invitesFunc.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">Invitaciones de funcionarios</h2>
              <ul className="divide-y">
                {invitesFunc.map((inv) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-500">Expira {formatDate(inv.expira_en)}</p>
                    </div>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="text-rose-600 text-sm hover:underline"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Listado familiares */}
      {tab === "familiares" && (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-3">Familiares vinculados</h2>
            {familiares.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay familiares vinculados a residentes.</p>
            ) : (
              <ul className="divide-y">
                {familiares.map((row) => (
                  <li key={`${row.profile_id}-${row.residente_id}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {row.profiles?.nombre ?? "—"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {row.profiles?.email ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Vinculado a: {row.residentes?.apellido}, {row.residentes?.nombre}
                        {row.parentesco ? <> · {row.parentesco}</> : null}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnlink(row.profile_id, row.residente_id, row.profiles?.nombre ?? row.profiles?.email)}
                      className="text-rose-600 text-sm hover:underline shrink-0"
                    >
                      Quitar acceso
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {invitesFam.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">Invitaciones de familiares</h2>
              <ul className="divide-y">
                {invitesFam.map((inv) => {
                  const res = residentes.find((r) => r.id === inv.residente_id);
                  return (
                    <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{inv.email}</p>
                        <p className="text-xs text-gray-500">
                          {res ? <>Vinculado a: {res.apellido}, {res.nombre}</> : "Residente desconocido"}
                          {" · "}Expira {formatDate(inv.expira_en)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-rose-600 text-sm hover:underline"
                      >
                        Eliminar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
