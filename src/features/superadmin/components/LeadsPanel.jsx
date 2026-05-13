import React, { useEffect, useState } from "react";
import { useToast } from "../../../components/Toast";
import Modal from "../../../components/Modal";
import { friendlyError } from "../../../utils/errorMessages";

const ESTADO_LABELS = {
  nuevo:         { txt: "Nuevo",          cls: "bg-sky-100 text-sky-700" },
  contactado:    { txt: "Contactado",      cls: "bg-blue-100 text-blue-700" },
  demo_activo:   { txt: "Demo activo",     cls: "bg-teal-100 text-teal-700" },
  demo_completado:{ txt: "Demo completado", cls: "bg-green-100 text-green-700" },
  descartado:    { txt: "Descartado",      cls: "bg-gray-100 text-gray-500" },
  convertido:    { txt: "Convertido",      cls: "bg-emerald-100 text-emerald-700" },
};

const ESTADOS = Object.keys(ESTADO_LABELS);

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "2-digit",
    });
  } catch { return "—"; }
}

function demoPct(progreso) {
  if (!progreso) return 0;
  const total = 6 + 4 + 4;
  const done  = (progreso.admin_steps ?? 0) + (progreso.func_steps ?? 0) + (progreso.fam_steps ?? 0);
  return Math.min(100, Math.round((done / total) * 100));
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function LeadsPanel({
  leads,
  activeInDemo,
  contactRequests,
  loading,
  onGrantDemo,
  onUpdateLead,
  onLoadLeads,
}) {
  const toast = useToast();
  const [search, setSearch]       = useState("");
  const [filterEstado, setFilter] = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [editNotes, setEditNotes] = useState({});
  const [credenciales, setCredenciales] = useState(null); // { email, temp_password, email_sent, email_error }

  useEffect(() => { onLoadLeads({ estado: filterEstado || undefined, search }); }, []);

  const activeIds    = new Set(activeInDemo.map((a) => a.id));
  const contactIds   = new Set(contactRequests.map((c) => c.id));

  const filtered = leads.filter((l) => {
    if (filterEstado && l.estado !== filterEstado) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(l.nombre + l.email + l.eleam_nombre).toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const aPri = contactIds.has(a.id) ? 0 : activeIds.has(a.id) ? 1 : 2;
    const bPri = contactIds.has(b.id) ? 0 : activeIds.has(b.id) ? 1 : 2;
    if (aPri !== bPri) return aPri - bPri;
    return new Date(b.creado_en) - new Date(a.creado_en);
  });

  async function handleGrant(lead) {
    try {
      const updated = await onGrantDemo(lead.id);
      setCredenciales({
        email: updated.email ?? lead.email,
        temp_password: updated._temp_password,
        email_sent: updated._email_sent,
        email_error: updated._email_error,
        email_skipped: updated._email_skipped,
        reused_existing_user: updated._reused_existing_user,
        already_active: updated._already_active,
        repaired_existing_auth_user: updated._repaired_existing_auth_user,
        nombre: lead.nombre,
      });
      toast(
        updated._reused_existing_user || updated._already_active || updated._repaired_existing_auth_user
          ? "Demo activado para una cuenta existente"
          : "Usuario demo creado correctamente",
        "success",
      );
    } catch (e) {
      toast(friendlyError(e, "No se pudo activar el acceso demo. Intenta de nuevo o contacta soporte."), "error");
    }
  }

  async function handleEstadoChange(leadId, newEstado) {
    try {
      await onUpdateLead(leadId, { estado: newEstado });
      toast("Estado actualizado", "success");
    } catch (e) {
      toast(friendlyError(e, "No se pudo actualizar el estado. Intenta de nuevo."), "error");
    }
  }

  async function handleSaveNotes(leadId) {
    try {
      await onUpdateLead(leadId, { notas_admin: editNotes[leadId] ?? "" });
      toast("Notas guardadas", "success");
      setEditNotes((p) => ({ ...p, [leadId]: undefined }));
    } catch (e) {
      toast(friendlyError(e, "No se pudieron guardar las notas. Intenta de nuevo."), "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Modal de credenciales del usuario demo recién creado */}
      {credenciales && (
        <Modal
          isOpen={true}
          onClose={() => setCredenciales(null)}
          title={credenciales.temp_password ? "Usuario demo creado" : "Demo activado"}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {credenciales.temp_password ? (
                <>
                  {credenciales.repaired_existing_auth_user ? (
                    <>
                      Se reparó una cuenta Auth existente para <strong>{credenciales.nombre}</strong>.
                    </>
                  ) : (
                    <>
                      Se creó una cuenta para <strong>{credenciales.nombre}</strong>.
                    </>
                  )}
                  {credenciales.email_sent
                    ? " Le enviamos las credenciales por correo."
                    : " Comparte estas credenciales manualmente."}
                </>
              ) : (
                <>
                  {credenciales.repaired_existing_auth_user ? (
                    <>
                      El demo quedó activo para <strong>{credenciales.nombre}</strong> reparando una cuenta Auth existente.
                      Se generó una contraseña temporal nueva.
                    </>
                  ) : (
                    <>
                      El demo quedó activo para <strong>{credenciales.nombre}</strong> usando una cuenta existente.
                      No se generó una contraseña temporal nueva.
                    </>
                  )}
                </>
              )}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-700"><strong>Correo:</strong> {credenciales.email}</p>
              {credenciales.temp_password && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700">
                    <strong>Contraseña temporal:</strong>{" "}
                    <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-base">
                      {credenciales.temp_password}
                    </span>
                  </p>
                  <button
                    onClick={() => { copyToClipboard(credenciales.temp_password); toast("Copiada", "success"); }}
                    className="text-xs text-slate-500 hover:text-slate-700 border border-slate-300 rounded px-2 py-1"
                  >
                    Copiar
                  </button>
                </div>
              )}
            </div>
            {credenciales.temp_password && !credenciales.email_sent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800">Correo no enviado automáticamente</p>
                <p className="mt-1 text-xs text-amber-700">
                  {credenciales.email_error
                    ? `Motivo: ${credenciales.email_error}`
                    : "Comparte las credenciales manualmente y revisa la configuración de Resend."}
                </p>
              </div>
            )}
            {credenciales.temp_password ? (
              <p className="text-xs text-gray-400">
                El usuario deberá cambiar esta contraseña en su primer acceso.
                Si tiene correo Gmail, podrá vincular Google después de entrar con esta contraseña temporal.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                El usuario debe ingresar con su contraseña actual o con Google si ya tenía ese método configurado.
              </p>
            )}
            <div className="flex justify-end gap-2">
              {credenciales.temp_password && (
                <button
                  onClick={() => { copyToClipboard(`Correo: ${credenciales.email}\nContraseña temporal: ${credenciales.temp_password}`); toast("Credenciales copiadas", "success"); }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Copiar todo
                </button>
              )}
              <button
                onClick={() => setCredenciales(null)}
                className="bg-[var(--color-primary,#2563eb)] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
              >
                Listo
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Alerts */}
      {contactRequests.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-red-500 font-bold text-xl shrink-0">!</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {contactRequests.length} lead{contactRequests.length > 1 ? "s solicitan" : " solicita"} contacto
            </p>
            <p className="text-xs text-red-600">Aparecen al inicio de la tabla.</p>
          </div>
        </div>
      )}
      {activeInDemo.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-teal-500 font-bold shrink-0">●</span>
          <p className="text-sm text-teal-800">
            <strong>{activeInDemo.length}</strong> lead{activeInDemo.length > 1 ? "s" : ""} en demo ahora:&nbsp;
            {activeInDemo.map((a, i) => (
              <span key={a.id}>{i > 0 ? ", " : ""}<strong>{a.nombre}</strong></span>
            ))}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o ELEAM..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{ESTADO_LABELS[e].txt}</option>
          ))}
        </select>
        <button
          onClick={() => onLoadLeads({ estado: filterEstado || undefined, search })}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Actualizar
        </button>
        <span className="text-xs text-gray-400">{filtered.length} leads</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">Cargando leads...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">No hay leads todavía.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const isActive   = activeIds.has(lead.id);
            const wantsContact = contactIds.has(lead.id);
            const estado = ESTADO_LABELS[lead.estado] ?? ESTADO_LABELS.nuevo;
            const pct    = demoPct(lead.demo_progreso);
            const isExpanded = expanded === lead.id;
            const notesVal = editNotes[lead.id] !== undefined ? editNotes[lead.id] : (lead.notas_admin ?? "");

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  wantsContact ? "border-red-300" : isActive ? "border-teal-300" : "border-gray-100"
                }`}
              >
                <div
                  className="p-4 cursor-pointer flex items-start gap-3"
                  onClick={() => setExpanded(isExpanded ? null : lead.id)}
                >
                  {/* Status dots */}
                  <div className="flex flex-col gap-1 pt-1 shrink-0">
                    {wantsContact && (
                      <span className="w-2 h-2 rounded-full bg-red-500" title="Solicita contacto" />
                    )}
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" title="En demo ahora" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{lead.nombre} · {lead.cargo}</p>
                        <p className="text-xs text-gray-500">{lead.eleam_nombre} · {lead.email}</p>
                        {lead.telefono && <p className="text-xs text-gray-400">{lead.telefono}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estado.cls}`}>
                          {estado.txt}
                        </span>
                        {wantsContact && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            Solicita contacto
                          </span>
                        )}
                        {isActive && (
                          <span className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            En demo ahora
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {formatDate(lead.creado_en)}
                        {lead.utm_source ? ` · ${lead.utm_source}` : ""}
                        {lead.num_residentes ? ` · ${lead.num_residentes} res.` : ""}
                      </span>
                      {lead.demo_token && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Demo</span>
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {wantsContact && lead.solicita_contacto_mensaje && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-800 mb-1">Mensaje del prospecto:</p>
                        <p className="text-sm text-red-700">{lead.solicita_contacto_mensaje}</p>
                        <p className="text-xs text-red-400 mt-1">{formatDateTime(lead.solicita_contacto_en)}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><p className="text-gray-400">Cargo</p><p className="font-medium">{lead.cargo}</p></div>
                      <div><p className="text-gray-400">Residentes</p><p className="font-medium">{lead.num_residentes ?? "—"}</p></div>
                      <div><p className="text-gray-400">Origen</p><p className="font-medium">{lead.utm_source ?? lead.referrer ?? "directo"}</p></div>
                      <div><p className="text-gray-400">Demo expira</p><p className="font-medium">{formatDate(lead.demo_expires_at)}</p></div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Notas internas</label>
                      <textarea
                        rows={2}
                        value={notesVal}
                        onChange={(e) => setEditNotes((p) => ({ ...p, [lead.id]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Notas de seguimiento..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Estado change */}
                      <select
                        value={lead.estado}
                        onChange={(e) => handleEstadoChange(lead.id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>{ESTADO_LABELS[e].txt}</option>
                        ))}
                      </select>

                      {/* Grant demo — creates real admin_eleam account.
                          Check both demo_user_id (new flow) and demo_token (legacy) to avoid duplicates. */}
                      {!lead.demo_user_id && !lead.demo_token ? (
                        <button
                          onClick={() => handleGrant(lead)}
                          className="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 font-semibold"
                        >
                          Dar acceso a demo
                        </button>
                      ) : (
                        <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-3 py-2 rounded-lg font-medium">
                          Demo activo
                        </span>
                      )}

                      {editNotes[lead.id] !== undefined && (
                        <button
                          onClick={() => handleSaveNotes(lead.id)}
                          className="bg-gray-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800"
                        >
                          Guardar notas
                        </button>
                      )}

                      {lead.solicita_contacto && (
                        <button
                          onClick={() => onUpdateLead(lead.id, { solicita_contacto: false }).then(() =>
                            toast("Marcado como contactado", "success")
                          )}
                          className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          Marcar contactado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
