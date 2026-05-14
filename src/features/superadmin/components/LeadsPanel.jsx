import React, { useEffect, useState } from "react";
import { useToast } from "../../../components/Toast";
import Modal from "../../../components/Modal";
import { friendlyError } from "../../../utils/errorMessages";
import { formatDate, formatDateTime } from "../../../utils/dateUtils";
import {
  demoAccessToneClasses,
  demoGrantResultMessage,
  getDemoLeadAccessState,
} from "../utils/demoAccess";

const ESTADO_LABELS = {
  nuevo:           { txt: "Nuevo",           cls: "bg-sky-100 text-sky-700" },
  contactado:      { txt: "Contactado",       cls: "bg-blue-100 text-blue-700" },
  demo_activo:     { txt: "Demo en curso",    cls: "bg-teal-100 text-teal-700" },
  demo_completado: { txt: "Demo completado",  cls: "bg-emerald-100 text-emerald-700" },
  descartado:      { txt: "Descartado",       cls: "bg-slate-100 text-slate-500" },
  convertido:      { txt: "Convertido",       cls: "bg-emerald-100 text-emerald-700" },
};

const ESTADOS = Object.keys(ESTADO_LABELS);

function demoPct(progreso) {
  if (!progreso) return 0;
  const total = 6 + 4 + 4;
  const done  = (progreso.admin_steps ?? 0) + (progreso.func_steps ?? 0) + (progreso.fam_steps ?? 0);
  return Math.min(100, Math.round((done / total) * 100));
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
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
  const [credenciales, setCredenciales] = useState(null);
  const [grantingLeadId, setGrantingLeadId] = useState(null);

  useEffect(() => { onLoadLeads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIds  = new Set(activeInDemo.map((a) => a.id));
  const contactIds = new Set(contactRequests.map((c) => c.id));

  const filtered = leads.filter((l) => {
    if (filterEstado && l.estado !== filterEstado) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(l.nombre + l.email + (l.eleam_nombre ?? "")).toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const aPri = contactIds.has(a.id) ? 0 : activeIds.has(a.id) ? 1 : 2;
    const bPri = contactIds.has(b.id) ? 0 : activeIds.has(b.id) ? 1 : 2;
    if (aPri !== bPri) return aPri - bPri;
    return new Date(b.creado_en) - new Date(a.creado_en);
  });

  async function handleGrant(lead) {
    if (grantingLeadId) return;
    setGrantingLeadId(lead.id);
    try {
      const updated = await onGrantDemo(lead.id);
      const resultMessage = demoGrantResultMessage({
        ...updated,
        code: updated._code,
        message: updated._message,
      });
      setCredenciales({
        email:                      updated.email ?? lead.email,
        temp_password:              updated._temp_password,
        email_sent:                 updated._email_sent,
        email_error:                updated._email_error,
        email_skipped:              updated._email_skipped,
        reused_existing_user:       updated._reused_existing_user,
        already_active:             updated._already_active,
        repaired_existing_auth_user:updated._repaired_existing_auth_user,
        nombre:                     lead.nombre,
        result_message:             resultMessage,
      });
      toast(resultMessage.toast, "success");
    } catch (e) {
      const resultMessage = demoGrantResultMessage({ code: e.code, message: e.message });
      toast(resultMessage.toast, "error");
    } finally {
      setGrantingLeadId(null);
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
      setEditNotes((p) => { const n = { ...p }; delete n[leadId]; return n; });
    } catch (e) {
      toast(friendlyError(e, "No se pudieron guardar las notas. Intenta de nuevo."), "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Modal credenciales */}
      {credenciales && (
        <Modal
          isOpen={true}
          onClose={() => setCredenciales(null)}
          title={credenciales.result_message?.title ?? (credenciales.temp_password ? "Usuario demo creado" : "Demo activado")}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{credenciales.nombre}</strong>: {credenciales.result_message?.body ?? (
                credenciales.temp_password
                  ? "Cuenta demo habilitada. Comparte las credenciales si el correo no fue enviado."
                  : "Cuenta existente habilitada para demo. No se genero contrasena nueva."
              )}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-slate-700"><strong>Correo:</strong> {credenciales.email}</p>
              {credenciales.temp_password && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-slate-700">
                    <strong>Contraseña temporal:</strong>{" "}
                    <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-base select-all">
                      {credenciales.temp_password}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => { copyToClipboard(credenciales.temp_password); toast("Copiada", "success"); }}
                    className="text-xs text-teal-700 border border-teal-200 bg-teal-50 rounded-lg px-2.5 py-1 hover:bg-teal-100 font-medium"
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

            <p className="text-xs text-slate-400">
              {credenciales.temp_password
                ? "El usuario deberá cambiar esta contraseña en su primer acceso. Si tiene Gmail, puede vincular Google desde /cambiar-clave."
                : "El usuario accede con su contraseña actual, Google si ya estaba configurado, o puede usar recuperar acceso."}
            </p>

            <div className="flex justify-end gap-2">
              {credenciales.temp_password && (
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(`Correo: ${credenciales.email}\nContraseña temporal: ${credenciales.temp_password}`);
                    toast("Credenciales copiadas", "success");
                  }}
                  className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50"
                >
                  Copiar todo
                </button>
              )}
              <button
                type="button"
                onClick={() => setCredenciales(null)}
                className="bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-800"
              >
                Listo
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Alert banners */}
      {(contactRequests.length > 0 || activeInDemo.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {contactRequests.length > 0 && (
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="text-base font-bold tabular-nums">{contactRequests.length}</span>
              solicitan contacto — aparecen al inicio
            </div>
          )}
          {activeInDemo.length > 0 && (
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs font-semibold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
              <span className="text-base font-bold tabular-nums">{activeInDemo.length}</span>
              en demo ahora:&nbsp;
              {activeInDemo.slice(0, 2).map((a, i) => (
                <span key={a.id}>{i > 0 ? ", " : ""}<strong>{a.nombre}</strong></span>
              ))}
              {activeInDemo.length > 2 && <span className="opacity-70"> +{activeInDemo.length - 2} más</span>}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o ELEAM…"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-slate-50"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{ESTADO_LABELS[e].txt}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onLoadLeads({ estado: filterEstado || undefined, search })}
          className="border border-slate-200 text-slate-600 px-3.5 py-2 rounded-xl text-sm hover:bg-slate-50 font-medium transition-colors"
        >
          Actualizar
        </button>
        <span className="text-xs text-slate-400 ml-auto">
          <strong className="text-slate-700 tabular-nums">{filtered.length}</strong> lead{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-slate-400 py-8 text-sm">Cargando leads…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">
          <p className="text-slate-400 text-sm">No hay leads que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const isActive     = activeIds.has(lead.id);
            const wantsContact = contactIds.has(lead.id);
            const estado       = ESTADO_LABELS[lead.estado] ?? ESTADO_LABELS.nuevo;
            const pct          = demoPct(lead.demo_progreso);
            const isExpanded   = expanded === lead.id;
            const notesVal     = editNotes[lead.id] !== undefined ? editNotes[lead.id] : (lead.notas_admin ?? "");
            const accessState  = getDemoLeadAccessState(lead);
            const isGranting   = grantingLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${
                  wantsContact ? "border-rose-200" : isActive ? "border-teal-200" : "border-slate-100"
                }`}
              >
                {/* Card header — clickable */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : lead.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : lead.id); } }}
                  className="p-4 cursor-pointer flex items-start gap-3 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-inset"
                >
                  {/* Status dots column */}
                  <div className="flex flex-col gap-1 pt-1 shrink-0 w-2.5">
                    {wantsContact && <span className="w-2.5 h-2.5 rounded-full bg-rose-500" title="Solicita contacto" />}
                    {isActive && <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" title="En demo ahora" />}
                    {!wantsContact && !isActive && <span className="w-2.5 h-2.5 rounded-full bg-transparent" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">
                          {lead.nombre}
                          {lead.cargo && <span className="font-normal text-slate-500"> · {lead.cargo}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lead.eleam_nombre && <span className="font-medium text-slate-600">{lead.eleam_nombre}</span>}
                          {lead.eleam_nombre && lead.email && " · "}
                          {lead.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${estado.cls}`}>
                          {estado.txt}
                        </span>
                        {wantsContact && (
                          <span className="bg-rose-100 text-rose-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                            Contacto
                          </span>
                        )}
                        {isActive && (
                          <span className="bg-teal-50 text-teal-700 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-teal-200">
                            En demo
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${demoAccessToneClasses(accessState.tone)}`}>
                          {accessState.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        {formatDate(lead.creado_en)}
                        {lead.utm_source ? ` · ${lead.utm_source}` : ""}
                        {lead.num_residentes ? ` · ${lead.num_residentes} res.` : ""}
                      </span>
                      {lead.demo_token && !lead.demo_user_id && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Demo guiado</span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-teal-700 font-medium">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronIcon open={isExpanded} />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/70">
                    {/* Contact request message */}
                    {wantsContact && lead.solicita_contacto_mensaje && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-rose-800 mb-1">Mensaje del prospecto:</p>
                        <p className="text-sm text-rose-700 leading-snug">{lead.solicita_contacto_mensaje}</p>
                        <p className="text-[11px] text-rose-400 mt-1.5">{formatDateTime(lead.solicita_contacto_en)}</p>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[ 
                        { label: "Cargo", value: lead.cargo },
                        { label: "Residentes", value: lead.num_residentes ?? "—" },
                        { label: "Origen", value: lead.utm_source ?? lead.referrer ?? "Directo" },
                        { label: "Acceso demo", value: accessState.label },
                        { label: "Demo expira", value: formatDate(lead.demo_expires_at) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-lg border border-slate-100 px-2.5 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{label}</p>
                          <p className="text-xs font-medium text-slate-700 mt-0.5">{value ?? "—"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                        Notas internas
                      </label>
                      <textarea
                        rows={2}
                        value={notesVal}
                        onChange={(e) => setEditNotes((p) => ({ ...p, [lead.id]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                        placeholder="Notas de seguimiento…"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={lead.estado}
                        onChange={(e) => handleEstadoChange(lead.id, e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>{ESTADO_LABELS[e].txt}</option>
                        ))}
                      </select>

                      {accessState.canGrant ? (
                        <button
                          type="button"
                          onClick={() => handleGrant(lead)}
                          disabled={isGranting || Boolean(grantingLeadId)}
                          className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-700 font-semibold transition-colors disabled:opacity-60"
                        >
                          {isGranting ? "Aprobando..." : accessState.actionLabel}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 text-xs border px-3 py-2 rounded-xl font-medium ${demoAccessToneClasses(accessState.tone)}`}>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {accessState.actionLabel}
                        </span>
                      )}

                      {editNotes[lead.id] !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(lead.id)}
                          className="bg-slate-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          Guardar notas
                        </button>
                      )}

                      {lead.solicita_contacto && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateLead(lead.id, { solicita_contacto: false }).then(() =>
                              toast("Marcado como contactado", "success"),
                            )
                          }
                          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
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
