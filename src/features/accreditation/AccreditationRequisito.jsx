import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import {
  getRequisitoEleam,
  getDocumentos,
  getObservaciones,
  getAuditTrail,
  uploadEvidence,
  getSignedUrl,
  archiveDocumento,
  setRequisitoEstado,
  marcarNoAplica,
  marcarCumple,
  asignarResponsable,
  crearObservacion,
  cerrarObservacion,
  estadoMeta,
  formatDate,
  diasHasta,
  validateFile,
} from "./accreditationService";
import { isValidUUID } from "../../utils/validators";

function StatePill({ estado }) {
  const m = estadoMeta(estado);
  return (
    <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${m.cls}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${m.dot}`} />
      {m.label}
    </span>
  );
}

function StateActions({ re, onChange, isAdmin }) {
  const [showNA, setShowNA] = useState(false);
  const [naMotivo, setNaMotivo] = useState("");
  const [showCumple, setShowCumple] = useState(false);
  const [fechaVenc, setFechaVenc] = useState(re.fecha_vencimiento ?? "");
  const [busy, setBusy] = useState(false);

  const change = async (estado, extra = {}) => {
    setBusy(true);
    try { await onChange({ estado, ...extra }); }
    finally { setBusy(false); }
  };

  const submitNoAplica = async () => {
    if (!naMotivo.trim()) return;
    setBusy(true);
    try { await onChange({ noAplica: naMotivo.trim() }); setShowNA(false); setNaMotivo(""); }
    finally { setBusy(false); }
  };

  const submitCumple = async () => {
    setBusy(true);
    try { await onChange({ cumple: fechaVenc || null }); setShowCumple(false); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowCumple((s) => !s)}
          disabled={busy}
          className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-700"
        >
          ✓ Marcar cumple
        </Button>
        <Button
          onClick={() => change("pendiente", { fecha_vencimiento: null })}
          disabled={busy}
          className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-amber-600"
        >
          Marcar pendiente
        </Button>
        <Button
          onClick={() => change("no_cumple")}
          disabled={busy}
          className="bg-rose-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-rose-700"
        >
          No cumple
        </Button>
        {isAdmin && re.requisito?.permite_no_aplica && (
          <Button
            onClick={() => setShowNA((s) => !s)}
            disabled={busy}
            className="bg-slate-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-600"
          >
            Marcar no aplica
          </Button>
        )}
      </div>

      {showCumple && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-emerald-800">
            {re.requisito?.requiere_vencimiento
              ? "Indica la fecha de vencimiento (este documento se renueva)."
              : "Si tiene fecha de vigencia, agrégala aquí. Si no, deja vacío."}
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs uppercase font-semibold text-emerald-700 mb-1 block">
                Fecha de vencimiento (opcional)
              </label>
              <Input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} />
            </div>
            <Button
              onClick={submitCumple}
              disabled={busy}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}

      {showNA && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-700">
            "No aplica" se usa cuando este requisito no corresponde a tu ELEAM
            (ej. ascensor en establecimiento sin ascensor). Indica el motivo:
          </p>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Motivo (ej. el ELEAM no cuenta con caldera)"
            value={naMotivo}
            onChange={(e) => setNaMotivo(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => { setShowNA(false); setNaMotivo(""); }}
              className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitNoAplica}
              disabled={busy || !naMotivo.trim()}
              className="bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm disabled:opacity-50"
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadForm({ reId, requiereVenc, onUploaded, hasVigente }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateFile(file);
    if (err) return toast(err, "error");
    setBusy(true);
    try {
      await uploadEvidence({
        reId,
        file,
        fechaEmision,
        fechaVencimiento,
        notas,
        reemplazo: hasVigente,
      });
      toast(hasVigente ? "Documento reemplazado" : "Documento subido", "success");
      setFile(null); setFechaEmision(""); setFechaVencimiento(""); setNotas("");
      setOpen(false);
      onUploaded?.();
    } catch (err2) {
      toast(err2.message || "Error al subir", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-[var(--color-primary)] text-white text-sm px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
      >
        {hasVigente ? "+ Reemplazar evidencia" : "+ Subir evidencia"}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-teal-800 font-semibold">
        {hasVigente
          ? "Reemplazar evidencia (la versión anterior se conserva en el historial)"
          : "Subir evidencia"}
      </p>

      <div>
        <label className="text-xs uppercase font-semibold text-teal-700 mb-1 block">Archivo (máx 10MB)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase font-semibold text-teal-700 mb-1 block">Fecha emisión</label>
          <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-teal-700 mb-1 block">
            Fecha vencimiento {requiereVenc && <span className="text-rose-600">*</span>}
          </label>
          <Input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            required={requiereVenc}
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-teal-700 mb-1 block">Notas (opcional)</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)] text-sm disabled:opacity-50"
        >
          {busy ? "Subiendo..." : hasVigente ? "Reemplazar" : "Subir"}
        </Button>
      </div>
    </form>
  );
}

function DocumentItem({ doc, onView, onArchive, isAdmin, isVigente }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wide text-gray-400">
            v{doc.version}
          </span>
          {isVigente ? (
            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Vigente
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Histórico
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-800 truncate">{doc.archivo_nombre}</p>
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 mt-1">
          {doc.fecha_emision && <span>Emisión: {formatDate(doc.fecha_emision)}</span>}
          {doc.fecha_vencimiento && <span>Vence: {formatDate(doc.fecha_vencimiento)}</span>}
          <span>Subido: {formatDate(doc.creado_en)}</span>
          {doc.subido_por?.nombre && <span>por {doc.subido_por.nombre}</span>}
        </div>
        {doc.notas && <p className="text-xs text-gray-500 italic mt-1">{doc.notas}</p>}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => onView(doc)}
          className="text-xs text-[var(--color-primary)] hover:underline font-semibold"
        >
          Ver
        </button>
        {isAdmin && (
          <button
            onClick={() => onArchive(doc)}
            className="text-xs text-rose-600 hover:underline"
          >
            Archivar
          </button>
        )}
      </div>
    </div>
  );
}

function ObservacionItem({ obs, onCerrar, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);

  const isAbierta = obs.estado === "abierta" || obs.estado === "en_proceso";
  const tone = obs.origen === "fiscalizacion"
    ? "border-rose-200 bg-rose-50"
    : "border-orange-200 bg-orange-50";

  const submit = async () => {
    setBusy(true);
    try { await onCerrar(obs.id, nota); setOpen(false); setNota(""); }
    finally { setBusy(false); }
  };

  return (
    <div className={`border rounded-xl p-3 ${tone}`}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[10px] uppercase font-bold tracking-wide text-gray-700">
          {obs.origen === "fiscalizacion" ? "Fiscalización" : "Interna"}
        </span>
        <span className={`text-[10px] uppercase font-bold rounded-full px-2 py-0.5 ${
          obs.estado === "cerrada" ? "bg-emerald-100 text-emerald-700" :
          obs.estado === "en_proceso" ? "bg-amber-100 text-amber-700" :
          "bg-rose-100 text-rose-700"
        }`}>
          {obs.estado}
        </span>
        <span className="text-xs text-gray-500">{formatDate(obs.fecha)}</span>
      </div>
      <p className="text-sm text-gray-800">{obs.descripcion}</p>
      {obs.acciones_subsanacion && (
        <p className="text-xs text-gray-600 mt-1">
          <strong>Subsanación:</strong> {obs.acciones_subsanacion}
        </p>
      )}
      {obs.fecha_compromiso && (
        <p className="text-xs text-gray-600">
          <strong>Compromiso:</strong> {formatDate(obs.fecha_compromiso)}
        </p>
      )}
      {obs.creador?.nombre && (
        <p className="text-[11px] text-gray-400 mt-1">
          Creada por {obs.creador.nombre}
        </p>
      )}
      {obs.estado === "cerrada" && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-emerald-700">
            Cerrada el {formatDate(obs.cerrada_en)}
            {obs.cerrador?.nombre ? ` por ${obs.cerrador.nombre}` : ""}
          </p>
          {obs.cerrada_nota && <p className="text-xs text-gray-600 italic">"{obs.cerrada_nota}"</p>}
        </div>
      )}
      {isAbierta && isAdmin && (
        !open ? (
          <button onClick={() => setOpen(true)} className="text-xs text-[var(--color-primary)] hover:underline mt-2 font-semibold">
            Cerrar observación
          </button>
        ) : (
          <div className="mt-2 space-y-2">
            <textarea
              rows={2}
              placeholder="Nota de cierre (cómo fue subsanada)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
              <Button
                onClick={submit}
                disabled={busy}
                className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {busy ? "Cerrando..." : "Cerrar"}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function NewObservacionForm({ reId, onCreated, isAdmin }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [origen, setOrigen] = useState("interna");
  const [descripcion, setDescripcion] = useState("");
  const [accionesSubsanacion, setAcciones] = useState("");
  const [fechaCompromiso, setFechaCompromiso] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--color-primary)] hover:underline font-semibold"
      >
        + Registrar observación
      </button>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descripcion.trim()) return toast("Describe la observación", "error");
    setBusy(true);
    try {
      await crearObservacion({
        requisitoEleamId: reId,
        origen,
        descripcion,
        accionesSubsanacion,
        fechaCompromiso,
      });
      toast("Observación registrada", "success");
      setOpen(false);
      setDescripcion(""); setAcciones(""); setFechaCompromiso(""); setOrigen("interna");
      onCreated?.();
    } catch (err) {
      toast(err.message || "Error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-orange-800">Nueva observación</p>

      {isAdmin && (
        <div>
          <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Origen</label>
          <select
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="interna">Interna (auto-revisión)</option>
            <option value="fiscalizacion">Fiscalización (SEREMI/Municipalidad)</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Descripción *</label>
        <textarea
          rows={3}
          required
          placeholder="¿Qué está observado o falta?"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Acciones de subsanación (opcional)</label>
        <textarea
          rows={2}
          value={accionesSubsanacion}
          onChange={(e) => setAcciones(e.target.value)}
          placeholder="¿Qué se hará para resolverlo?"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Fecha compromiso (opcional)</label>
        <Input type="date" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

function AuditList({ items }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Sin actividad registrada todavía.</p>;
  }
  const ACCION_LABEL = {
    create: "Creó", update: "Actualizó", replace: "Reemplazó",
    archive: "Archivó", close: "Cerró", delete: "Eliminó",
  };
  const ENTIDAD_LABEL = {
    requisito_eleam: "el requisito",
    documento: "un documento",
    observacion: "una observación",
  };
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="py-2 text-sm">
          <span className="font-semibold text-gray-700">{a.realizado_por?.nombre ?? "—"}</span>{" "}
          <span className="text-gray-500">
            {ACCION_LABEL[a.accion] ?? a.accion} {ENTIDAD_LABEL[a.entidad] ?? a.entidad}
          </span>
          <span className="text-xs text-gray-400 ml-2">{formatDate(a.realizado_en)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AccreditationRequisito() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, isAdminEleam } = useAuth();

  const [re, setRe] = useState(null);
  const [docs, setDocs] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("evidencia");
  const [loading, setLoading] = useState(true);
  const [showHistorial, setShowHistorial] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isValidUUID(id)) return;
    setLoading(true);
    try {
      const [r, d, h, o, a] = await Promise.all([
        getRequisitoEleam(id),
        getDocumentos(id),
        getDocumentos(id, { incluirHistoria: true }),
        getObservaciones({ requisitoEleamId: id }),
        getAuditTrail({ entidadId: id, limit: 30 }),
      ]);
      setRe(r);
      setDocs(d);
      setHistorial(h);
      setObservaciones(o);
      setAudit(a);
    } catch (e) {
      toast(e.message || "Error al cargar", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStateChange = async ({ estado, noAplica, cumple, fecha_vencimiento }) => {
    try {
      if (noAplica !== undefined) {
        await marcarNoAplica(id, noAplica);
      } else if (cumple !== undefined) {
        await marcarCumple(id, cumple);
      } else {
        await setRequisitoEstado(id, { estado, ...(fecha_vencimiento !== undefined ? { fecha_vencimiento } : {}) });
      }
      toast("Estado actualizado", "success");
      await loadAll();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  const handleViewDoc = async (doc) => {
    const url = await getSignedUrl(doc.storage_path);
    if (url) window.open(url, "_blank");
    else toast("No se pudo generar el enlace", "error");
  };

  const handleArchive = async (doc) => {
    if (!window.confirm(`¿Archivar "${doc.archivo_nombre}"? Quedará en el historial pero no será la versión vigente.`)) return;
    try {
      await archiveDocumento(doc.id);
      toast("Documento archivado", "info");
      await loadAll();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  const handleAssignSelf = async () => {
    try {
      await asignarResponsable(id, profile.id);
      toast("Te asignaste como responsable", "success");
      await loadAll();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  const handleCerrarObs = async (obsId, nota) => {
    try {
      await cerrarObservacion(obsId, nota);
      toast("Observación cerrada", "success");
      await loadAll();
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  };

  if (loading) return <Loading message="Cargando requisito..." />;
  if (!re) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-2">Requisito no encontrado</h1>
        <button
          onClick={() => navigate("/accreditation")}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const r = re.requisito;
  const a = r.ambito;
  const vigente = docs[0] ?? null;
  const dias = diasHasta(re.fecha_vencimiento);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <button
        onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        ← {a.icono} {a.nombre}
      </button>

      {/* Header */}
      <header className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[10px] font-mono bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
            {r.codigo}
          </span>
          <StatePill estado={re.estado} />
          {re.fecha_vencimiento && dias != null && (
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
              dias < 0 ? "bg-rose-100 text-rose-700" :
              dias <= 30 ? "bg-amber-100 text-amber-800" :
              "bg-emerald-100 text-emerald-700"
            }`}>
              {dias < 0 ? `Venció hace ${Math.abs(dias)}d` :
               dias === 0 ? "Vence hoy" :
               `Vence en ${dias}d`}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">{r.nombre}</h1>
        {r.descripcion && (
          <p className="text-sm text-gray-600 mb-2">{r.descripcion}</p>
        )}
        {r.medio_verificador && (
          <p className="text-sm text-gray-500">
            <strong className="text-gray-700">Medio verificador:</strong> {r.medio_verificador}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <p className="uppercase font-semibold text-gray-400 mb-1">Responsable</p>
            {re.responsable?.nombre ? (
              <p>{re.responsable.nombre}{" "}
                <span className="text-gray-500">({re.responsable.rol})</span>
              </p>
            ) : (
              <button onClick={handleAssignSelf} className="text-[var(--color-primary)] hover:underline">
                + Asignarme
              </button>
            )}
          </div>
          <div>
            <p className="uppercase font-semibold text-gray-400 mb-1">Última revisión</p>
            <p>{re.ultima_revision_en ? formatDate(re.ultima_revision_en) : "—"}</p>
          </div>
        </div>

        {re.no_aplica_motivo && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Motivo "no aplica"</p>
            <p className="text-sm text-slate-700">{re.no_aplica_motivo}</p>
          </div>
        )}

        <div className="mt-5">
          <StateActions re={re} onChange={handleStateChange} isAdmin={isAdminEleam} />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "evidencia", label: `Evidencias (${docs.length})` },
          { key: "observaciones", label: `Observaciones (${observaciones.length})` },
          { key: "historial", label: `Historial (${audit.length})` },
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

      {/* Evidencias */}
      {tab === "evidencia" && (
        <section className="space-y-3">
          <UploadForm
            reId={id}
            requiereVenc={r.requiere_vencimiento}
            hasVigente={Boolean(vigente)}
            onUploaded={loadAll}
          />

          {docs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-500">
              Aún no hay evidencias cargadas para este requisito.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <DocumentItem
                  key={d.id}
                  doc={d}
                  onView={handleViewDoc}
                  onArchive={handleArchive}
                  isAdmin={isAdminEleam}
                  isVigente
                />
              ))}
            </div>
          )}

          {historial.filter((d) => !d.vigente).length > 0 && (
            <div className="pt-3">
              <button
                onClick={() => setShowHistorial((s) => !s)}
                className="text-sm text-gray-500 hover:underline"
              >
                {showHistorial ? "Ocultar" : "Ver"} historial de versiones anteriores ({historial.filter((d) => !d.vigente).length})
              </button>
              {showHistorial && (
                <div className="space-y-2 mt-2">
                  {historial.filter((d) => !d.vigente).map((d) => (
                    <DocumentItem
                      key={d.id}
                      doc={d}
                      onView={handleViewDoc}
                      onArchive={() => {}}
                      isAdmin={false}
                      isVigente={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Observaciones */}
      {tab === "observaciones" && (
        <section className="space-y-3">
          <NewObservacionForm reId={id} onCreated={loadAll} isAdmin={isAdminEleam} />
          {observaciones.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-500">
              Sin observaciones registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {observaciones.map((obs) => (
                <ObservacionItem
                  key={obs.id}
                  obs={obs}
                  onCerrar={handleCerrarObs}
                  isAdmin={isAdminEleam}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Historial */}
      {tab === "historial" && (
        <section className="bg-white border border-gray-100 rounded-2xl p-5">
          <AuditList items={audit} />
        </section>
      )}
    </div>
  );
}
