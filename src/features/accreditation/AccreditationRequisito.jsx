import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import { FeatureCoach } from "../featureCoach";
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
  marcarVigente,
  asignarResponsable,
  crearObservacion,
  cerrarObservacion,
  estadoMeta,
  diasHasta,
  validateFile,
} from "./accreditationService";
import { isValidUUID } from "../../utils/validators";
import { formatDate } from "../../utils/dateUtils";
import { friendlyError } from "../../utils/errorMessages";

function StatePill({ estado }) {
  const m = estadoMeta(estado);
  return (
    <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${m.cls}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${m.dot}`} />
      {m.label}
    </span>
  );
}

const STATUS_OPTIONS = [
  {
    value: "vigente",
    label: "Vigente",
    description: "La evidencia vigente está cargada y el requisito queda al día.",
  },
  {
    value: "en_revision",
    label: "En revisión",
    description: "La evidencia o el registro está cargado y falta validación interna.",
  },
  {
    value: "requiere_actualizacion",
    label: "Requiere actualización",
    description: "El requisito sigue aplicando, pero debe actualizarse por vigencia, cambio operativo o nueva evidencia.",
  },
  {
    value: "pendiente",
    label: "Pendiente",
    description: "Aún falta cargar evidencia, revisarla o completar información.",
  },
  {
    value: "observado",
    label: "Observado",
    description: "Hay una observación abierta que debe subsanarse antes de cumplir.",
  },
  {
    value: "no_cumple",
    label: "No cumple",
    description: "El requisito fue revisado y no satisface lo solicitado.",
  },
  {
    value: "vencido",
    label: "Vencido",
    description: "La evidencia perdió vigencia y debe renovarse.",
  },
  {
    value: "no_aplica",
    label: "No aplica",
    description: "El requisito no corresponde a este ELEAM. Requiere motivo.",
  },
];

const STATUS_DESCRIPTIONS = STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.description;
  return acc;
}, {});

function getDueBadge(fechaVencimiento) {
  const dias = diasHasta(fechaVencimiento);
  if (dias == null) return null;
  if (dias < 0) {
    return {
      label: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`,
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  if (dias === 0) {
    return { label: "Vence hoy", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  if (dias <= 30) {
    return { label: `Vence en ${dias} días`, cls: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  return { label: `Vence en ${dias} días`, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function DetailTile({ label, children, action }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {action}
      </div>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function StateActions({ re, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [naMotivo, setNaMotivo] = useState("");
  const [fechaVenc, setFechaVenc] = useState(re.fecha_vencimiento ?? "");
  const [busy, setBusy] = useState(false);
  const currentMeta = estadoMeta(re.estado);
  const dueBadge = getDueBadge(re.fecha_vencimiento);
  const canUseNoAplica = Boolean(re.requisito?.permite_no_aplica);
  const availableStates = STATUS_OPTIONS.filter((option) => (
    option.value !== re.estado && (option.value !== "no_aplica" || canUseNoAplica)
  ));
  const selectedOption = STATUS_OPTIONS.find((option) => option.value === selected);
  const needsFechaVencimiento = selected === "vigente" && re.requisito?.requiere_vencimiento;
  const submitDisabled =
    busy ||
    !selected ||
    (selected === "no_aplica" && !naMotivo.trim()) ||
    (needsFechaVencimiento && !fechaVenc);

  const submitChange = async () => {
    if (submitDisabled) return;
    setBusy(true);
    try {
      if (selected === "no_aplica") {
        await onChange({ noAplica: naMotivo.trim() });
        setNaMotivo("");
      } else if (selected === "vigente") {
        await onChange({ vigente: fechaVenc || null });
      } else if (selected === "pendiente") {
        await onChange({ estado: selected, fecha_vencimiento: null, no_aplica_motivo: null });
      } else {
        await onChange({ estado: selected, no_aplica_motivo: null });
      }
      setOpen(false);
      setSelected("");
    }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Estado actual</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatePill estado={re.estado} />
            {dueBadge && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${dueBadge.cls}`}>
                {dueBadge.label}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {STATUS_DESCRIPTIONS[re.estado] ?? currentMeta.label}
          </p>
          {re.fecha_vencimiento && (
            <p className="mt-1 text-xs text-slate-500">
              Fecha de vencimiento: {formatDate(re.fecha_vencimiento)}
            </p>
          )}
        </div>
        {canEdit && (
          <Button
            type="button"
            onClick={() => setOpen((value) => !value)}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
          >
            {open ? "Cerrar cambio" : "Cambiar estado"}
          </Button>
        )}
      </div>

      {re.no_aplica_motivo && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Motivo no aplica</p>
          <p className="text-sm text-slate-700">{re.no_aplica_motivo}</p>
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Selecciona el nuevo estado</p>
              <p className="text-xs text-slate-500">El cambio quedará registrado como última revisión del requisito.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availableStates.map((option) => {
              const meta = estadoMeta(option.value);
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  className={[
                    "rounded-xl border bg-white p-3 text-left transition-colors",
                    active ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-300",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-bold text-slate-800">{option.label}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                </button>
              );
            })}
          </div>

          {selected === "vigente" && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-emerald-700">
                Fecha de vencimiento {needsFechaVencimiento ? "*" : "(opcional)"}
              </label>
              <Input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} required={needsFechaVencimiento} />
              <p className="mt-2 text-xs text-emerald-800">
                {needsFechaVencimiento
                  ? "Este requisito se renueva periódicamente; registra la fecha para alertar a tiempo."
                  : "Úsala solo si la evidencia tiene vigencia definida."}
              </p>
            </div>
          )}

          {selected === "no_aplica" && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Motivo *
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Ej. el ELEAM no cuenta con ascensor, por lo que este certificado no corresponde."
                value={naMotivo}
                onChange={(e) => setNaMotivo(e.target.value)}
              />
            </div>
          )}

          {selectedOption && selected !== "vigente" && selected !== "no_aplica" && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              {selectedOption.description}
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelected("");
                setNaMotivo("");
                setFechaVenc(re.fecha_vencimiento ?? "");
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitChange}
              disabled={submitDisabled}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? "Actualizando..." : "Aplicar cambio"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function UploadForm({ reId, requiereVenc, onUploaded, hasVigente }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setFile(null);
    setFechaEmision("");
    setFechaVencimiento("");
    setNotas("");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = (nextFile) => {
    if (!nextFile) {
      setFile(null);
      return;
    }
    const err = validateFile(nextFile);
    if (err) {
      toast(err, "error");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  };

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
      resetForm();
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
        className="bg-teal-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-800"
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
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={handleDrop}
          className={[
            "rounded-xl border border-dashed bg-white p-3 transition-colors",
            dragging ? "border-teal-500 bg-teal-50" : "border-teal-200 hover:border-teal-400",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            id={`evidencia-file-${reId}`}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            className="peer sr-only"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {file ? "Archivo listo para subir" : "Arrastra el archivo o selecciónalo desde tu equipo"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PDF, Word, Excel o imagen hasta 10 MB. Cada carga queda versionada en el historial.
              </p>
            </div>

            <label
              htmlFor={`evidencia-file-${reId}`}
              className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2"
            >
              <UploadIcon />
              {file ? "Cambiar archivo" : "Seleccionar archivo"}
            </label>
          </div>

          {file && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-teal-900">
                <span className="shrink-0 rounded-xl bg-white p-1 text-teal-700">
                  <FileIcon />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" title={file.name}>{file.name}</p>
                  <p className="text-xs text-teal-700">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-white"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
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
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={() => { resetForm(); setOpen(false); }}
          className="border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800 text-sm disabled:opacity-50"
        >
          {busy ? "Subiendo..." : hasVigente ? "Reemplazar" : "Subir"}
        </Button>
      </div>
    </form>
  );
}

function DocumentItem({ doc, onView, onArchive, isAdmin, isVigente }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400">
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
        <p className="text-sm font-semibold text-slate-800 truncate" title={doc.archivo_nombre}>{doc.archivo_nombre}</p>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 mt-1">
          {doc.fecha_emision && <span>Emisión: {formatDate(doc.fecha_emision)}</span>}
          {doc.fecha_vencimiento && <span>Vence: {formatDate(doc.fecha_vencimiento)}</span>}
          <span>Subido: {formatDate(doc.creado_en)}</span>
          {doc.subido_por?.nombre && <span>por {doc.subido_por.nombre}</span>}
        </div>
        {doc.notas && <p className="text-xs text-slate-500 italic mt-1">{doc.notas}</p>}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onView(doc)}
          className="text-xs text-teal-700 hover:underline font-semibold"
        >
          Ver
        </button>
        {isAdmin && (
          <button
            type="button"
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
        <span className="text-[10px] uppercase font-bold tracking-wide text-slate-700">
          {obs.origen === "fiscalizacion" ? "Fiscalización" : "Interna"}
        </span>
        <span className={`text-[10px] uppercase font-bold rounded-full px-2 py-0.5 ${
          obs.estado === "cerrada" ? "bg-emerald-100 text-emerald-700" :
          obs.estado === "en_proceso" ? "bg-amber-100 text-amber-700" :
          "bg-rose-100 text-rose-700"
        }`}>
          {obs.estado}
        </span>
        <span className="text-xs text-slate-500">{formatDate(obs.fecha)}</span>
      </div>
      <p className="text-sm text-slate-800">{obs.descripcion}</p>
      {obs.acciones_subsanacion && (
        <p className="text-xs text-slate-600 mt-1">
          <strong>Subsanación:</strong> {obs.acciones_subsanacion}
        </p>
      )}
      {obs.fecha_compromiso && (
        <p className="text-xs text-slate-600">
          <strong>Compromiso:</strong> {formatDate(obs.fecha_compromiso)}
        </p>
      )}
      {obs.creador?.nombre && (
        <p className="text-[11px] text-slate-400 mt-1">
          Creada por {obs.creador.nombre}
        </p>
      )}
      {obs.estado === "cerrada" && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className="text-xs text-emerald-700">
            Cerrada el {formatDate(obs.cerrada_en)}
            {obs.cerrador?.nombre ? ` por ${obs.cerrador.nombre}` : ""}
          </p>
          {obs.cerrada_nota && <p className="text-xs text-slate-600 italic">"{obs.cerrada_nota}"</p>}
        </div>
      )}
      {isAbierta && isAdmin && (
        !open ? (
          <button type="button"
 onClick={() => setOpen(true)} className="text-xs text-teal-700 hover:underline mt-2 font-semibold">
            Cerrar observación
          </button>
        ) : (
          <div className="mt-2 space-y-2">
            <textarea
              rows={2}
              placeholder="Nota de cierre (cómo fue subsanada)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button type="button"
 onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">Cancelar</button>
              <Button
                onClick={submit}
                disabled={busy}
                className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl disabled:opacity-50"
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
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-teal-700 hover:underline font-semibold"
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
      toast(friendlyError(err, "No se pudo registrar la observación. Intenta de nuevo."), "error");
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Acciones de subsanación (opcional)</label>
        <textarea
          rows={2}
          value={accionesSubsanacion}
          onChange={(e) => setAcciones(e.target.value)}
          placeholder="¿Qué se hará para resolverlo?"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
          className="border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 text-sm disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

function AuditList({ items }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Sin actividad registrada todavía.</p>;
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
          <span className="font-semibold text-slate-700">{a.realizado_por?.nombre ?? "—"}</span>{" "}
          <span className="text-slate-500">
            {ACCION_LABEL[a.accion] ?? a.accion} {ENTIDAD_LABEL[a.entidad] ?? a.entidad}
          </span>
          <span className="text-xs text-slate-400 ml-2">{formatDate(a.realizado_en)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AccreditationRequisito() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { profile, isAdminEleam, can } = useAuth();

  const [re, setRe] = useState(null);
  const [docs, setDocs] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("evidencia");
  const [loading, setLoading] = useState(true);
  const [showHistorial, setShowHistorial] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isValidUUID(id)) {
      setLoading(false);
      setRe(null);
      return;
    }
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
      toast(friendlyError(e, "No se pudo cargar el requisito. Recarga la página e intenta de nuevo."), "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStateChange = async ({ estado, noAplica, vigente, ...payload }) => {
    try {
      if (noAplica !== undefined) {
        await marcarNoAplica(id, noAplica);
      } else if (vigente !== undefined) {
        await marcarVigente(id, vigente);
      } else {
        await setRequisitoEstado(id, { estado, ...payload });
      }
      toast("Estado actualizado", "success");
      await loadAll();
    } catch (e) {
      toast(friendlyError(e, "No se pudo actualizar el estado. Intenta de nuevo."), "error");
    }
  };

  const handleViewDoc = async (doc) => {
    const url = await getSignedUrl(doc.storage_path);
    if (url) window.open(url, "_blank");
    else toast("No se pudo generar el enlace", "error");
  };

  const handleArchive = async (doc) => {
    const ok = await confirm({
      title: "Archivar documento",
      message: `¿Archivar "${doc.archivo_nombre}"?\nQuedará en el historial pero no será la versión vigente.`,
      confirmText: "Archivar",
      danger: true,
    });
    if (!ok) return;
    try {
      await archiveDocumento(doc.id);
      toast("Documento archivado", "info");
      await loadAll();
    } catch (e) {
      toast(friendlyError(e, "No se pudo archivar el documento. Intenta de nuevo."), "error");
    }
  };

  const handleAssignSelf = async () => {
    if (!profile?.id) {
      toast("No se pudo identificar tu perfil", "error");
      return;
    }

    try {
      await asignarResponsable(id, profile.id);
      toast("Te asignaste como responsable", "success");
      await loadAll();
    } catch (e) {
      toast(friendlyError(e, "No se pudo asignar el responsable. Intenta de nuevo."), "error");
    }
  };

  const handleCerrarObs = async (obsId, nota) => {
    try {
      await cerrarObservacion(obsId, nota);
      toast("Observación cerrada", "success");
      await loadAll();
    } catch (e) {
      toast(friendlyError(e, "No se pudo cerrar la observación. Intenta de nuevo."), "error");
    }
  };

  if (loading) return <Loading message="Cargando requisito..." />;
  if (!re) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-2">Requisito no encontrado</h1>
        <button
          type="button"
          onClick={() => navigate("/cumplimiento")}
          className="text-sm text-teal-700 hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const r = re.requisito;
  const a = r.ambito;
  const vigente = docs[0] ?? null;
  const canEditStatus = isAdminEleam || can("editar_acreditacion");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <FeatureCoach featureId="accreditation-requisito" standalone />
      <button
        type="button"
        onClick={() => navigate("/cumplimiento")}
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← {a.nombre}
      </button>

      {/* Header */}
      <header className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-mono bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
            {r.codigo}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {a.nombre}
          </span>
          {r.articulo_ref && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700">
              {r.articulo_ref}
            </span>
          )}
          {r.criticidad && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
              Criticidad {r.criticidad}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">{r.nombre}</h1>
        {r.descripcion && (
          <p className="text-sm text-slate-600 mb-2">{r.descripcion}</p>
        )}

        <div className="mt-5">
          <StateActions re={re} onChange={handleStateChange} canEdit={canEditStatus} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailTile
            label="Evidencia vigente"
            action={vigente && (
              <button
                type="button"
                onClick={() => handleViewDoc(vigente)}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Ver
              </button>
            )}
          >
            {vigente ? (
              <div className="min-w-0">
                <p className="truncate font-semibold" title={vigente.archivo_nombre}>{vigente.archivo_nombre}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  v{vigente.version}{vigente.fecha_vencimiento ? ` · vence ${formatDate(vigente.fecha_vencimiento)}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-slate-500">Sin evidencia vigente.</p>
            )}
          </DetailTile>

          <DetailTile label="Responsable">
            {re.responsable?.nombre ? (
              <p className="font-semibold">{re.responsable.nombre}{" "}
                <span className="text-slate-500">({re.responsable.rol})</span>
              </p>
            ) : (
              <button type="button" onClick={handleAssignSelf} className="font-semibold text-teal-700 hover:underline">
                + Asignarme
              </button>
            )}
          </DetailTile>

          <DetailTile label="Última revisión">
            <p>{re.ultima_revision_en ? formatDate(re.ultima_revision_en) : "Sin revisión registrada."}</p>
          </DetailTile>
        </div>

        {r.medio_verificador && (
          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">Medio verificador esperado</p>
            <p className="text-sm text-teal-900">{r.medio_verificador}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailTile label="Norma">
            <p className="font-semibold">{r.norma_codigo ?? "DS20"}</p>
            <p className="mt-0.5 text-xs text-slate-500">{r.articulo_ref ?? "Sin artículo asociado"}</p>
          </DetailTile>
          <DetailTile label="Evidencia DS 20">
            <p className="font-semibold">{r.tipo_evidencia ?? "documento"}</p>
            <p className="mt-0.5 text-xs text-slate-500">{r.origen_evidencia ?? "documental"}</p>
          </DetailTile>
          <DetailTile label="Operacional">
            <p>{r.requisito_operacional ? "Se alimenta con registros vivos de la app." : "Se resuelve con evidencia documental."}</p>
          </DetailTile>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "evidencia", label: `Evidencias (${docs.length})` },
          { key: "observaciones", label: `Observaciones (${observaciones.length})` },
          { key: "historial", label: `Historial (${audit.length})` },
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

      {/* Evidencias */}
      {tab === "evidencia" && (
        <section className="space-y-3">
          {can("subir_acreditacion") && (
            <UploadForm
              reId={id}
              requiereVenc={r.requiere_vencimiento}
              hasVigente={Boolean(vigente)}
              onUploaded={loadAll}
            />
          )}

          {docs.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl p-6 text-center text-slate-500">
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
                  isAdmin={can("archivar_acreditacion")}
                  isVigente={d.vigente}
                />
              ))}
            </div>
          )}

          {historial.filter((d) => !d.vigente).length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setShowHistorial((s) => !s)}
                className="text-sm text-slate-500 hover:underline"
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
            <div className="bg-white border border-slate-100 rounded-xl p-6 text-center text-slate-500">
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
        <section className="bg-white border border-slate-100 rounded-2xl p-5">
          <AuditList items={audit} />
        </section>
      )}
    </div>
  );
}
