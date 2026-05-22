import { useMemo, useState } from "react";
import { useToast } from "../../../components/Toast";
import Modal from "../../../components/Modal";
import { friendlyError } from "../../../utils/errorMessages";
import { formatDate } from "../../../utils/dateUtils";
import {
  demoAccessToneClasses,
  demoGrantResultMessage,
  getDemoLeadAccessState,
} from "../utils/demoAccess";
import { isWhatsAppLead } from "../../landing/whatsAppLeadUtils";

function WhatsAppBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      WhatsApp
    </span>
  );
}

function whatsAppLinkForLead(lead) {
  const phone = String(lead?.telefono ?? "").replace(/[^0-9]/g, "");
  if (!phone) return null;
  return `https://wa.me/${phone}`;
}

const ESTADO_LABELS = {
  nuevo:       { txt: "Nuevo",            cls: "bg-sky-100 text-sky-700" },
  contactado:  { txt: "Contactado",       cls: "bg-sky-100 text-sky-700" },
  demo_activo: { txt: "Demo en curso",    cls: "bg-teal-100 text-teal-700" },
  descartado:  { txt: "Descartado",       cls: "bg-slate-100 text-slate-500" },
  convertido:  { txt: "Convertido",       cls: "bg-emerald-100 text-emerald-700" },
};

const ESTADOS = Object.keys(ESTADO_LABELS);

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

  const filtered = useMemo(() => leads.filter((l) => {
    if (filterEstado && l.estado !== filterEstado) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(l.nombre + l.email + (l.eleam_nombre ?? "")).toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)), [leads, filterEstado, search]);

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
        email_sent:                 updated._email_sent,
        email_error:                updated._email_error,
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
          title={credenciales.result_message?.title ?? "Demo aprobado"}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{credenciales.nombre}</strong>: {credenciales.result_message?.body ??
                "Cuenta demo habilitada."}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700"><strong>Correo:</strong> {credenciales.email}</p>
              {credenciales.email_sent && (
                <p className="mt-1 text-sm text-emerald-700">
                  Se envió a este correo un enlace para definir la contraseña e ingresar.
                </p>
              )}
            </div>

            {credenciales.email_sent === false && credenciales.email_error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800">Correo de acceso no enviado</p>
                <p className="mt-1 text-xs text-amber-700">
                  Motivo: {credenciales.email_error}. El usuario puede pedir el enlace desde
                  "¿Olvidaste tu contraseña?" en el inicio de sesión.
                </p>
              </div>
            )}

            <div className="flex justify-end">
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
          onClick={() => onLoadLeads({ estado: filterEstado || undefined, search }, true)}
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
            const estado       = ESTADO_LABELS[lead.estado] ?? ESTADO_LABELS.nuevo;
            const isExpanded   = expanded === lead.id;
            const notesVal     = editNotes[lead.id] !== undefined ? editNotes[lead.id] : (lead.notas_admin ?? "");
            const accessState  = getDemoLeadAccessState(lead);
            const isGranting   = grantingLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
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
                        {isWhatsAppLead(lead) && <WhatsAppBadge />}
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${estado.cls}`}>
                          {estado.txt}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${demoAccessToneClasses(accessState.tone)}`}>
                          {accessState.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {formatDate(lead.creado_en)}
                      {lead.utm_source ? ` · ${lead.utm_source}` : ""}
                      {lead.num_residentes ? ` · ${lead.num_residentes} res.` : ""}
                    </p>
                  </div>

                  <ChevronIcon open={isExpanded} />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/70">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Cargo", value: lead.cargo },
                        { label: "Residentes", value: lead.num_residentes ?? "—" },
                        { label: "Origen", value: lead.utm_source ?? lead.referrer ?? "Directo" },
                        { label: "Acceso demo", value: accessState.label },
                        { label: "Demo expira", value: formatDate(lead.demo_expires_at) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-xl border border-slate-100 px-2.5 py-2">
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

                      {whatsAppLinkForLead(lead) && (
                        <a
                          href={whatsAppLinkForLead(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm px-3.5 py-2 rounded-xl font-semibold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          {isWhatsAppLead(lead) ? "Continuar WhatsApp" : "Abrir WhatsApp"}
                        </a>
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
