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
  getOperationalEvidence,
  getDocumentos,
  getObservaciones,
  getAuditTrail,
  uploadEvidence,
  getSignedUrl,
  archiveDocumento,
  setRequisitoEstado,
  marcarNoAplica,
  marcarVigente,
  reactivarEstadoAutomatico,
  asignarResponsable,
  crearObservacion,
  cerrarObservacion,
  estadoMeta,
  diasHasta,
  validateFile,
  getDocumentValidity,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "./accreditationService";
import { isValidUUID } from "../../utils/validators";
import { chileDateKey, formatDate, formatDateOnly } from "../../utils/dateUtils";
import { friendlyError } from "../../utils/errorMessages";
import { evidencePresentation, requirementNextAction } from "./complianceGuidance";

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
    return { label: "Vencido desde hoy", cls: "bg-rose-50 text-rose-700 border-rose-200" };
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

function StateActions({ re, onChange, onRestoreAutomatic, canEdit }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [naMotivo, setNaMotivo] = useState("");
  const [fechaVenc, setFechaVenc] = useState(re.fecha_vencimiento ?? "");
  const [manualReason, setManualReason] = useState("");
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
    (selected !== "no_aplica" && !manualReason.trim()) ||
    (needsFechaVencimiento && !fechaVenc);

  const submitChange = async () => {
    if (submitDisabled) return;
    setBusy(true);
    try {
      if (selected === "no_aplica") {
        await onChange({ noAplica: naMotivo.trim(), manualReason });
        setNaMotivo("");
      } else if (selected === "vigente") {
        await onChange({ vigente: fechaVenc || null, manualReason });
      } else if (selected === "pendiente") {
        await onChange({ estado: selected, fecha_vencimiento: null, no_aplica_motivo: null, estado_manual_motivo: manualReason });
      } else {
        await onChange({ estado: selected, no_aplica_motivo: null, estado_manual_motivo: manualReason });
      }
      setOpen(false);
      setSelected("");
      setManualReason("");
    }
    finally { setBusy(false); }
  };

  const restoreAutomatic = async () => {
    if (busy) return;
    setBusy(true);
    try { await onRestoreAutomatic?.(); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Estado actual</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatePill estado={re.estado} />
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${re.estado_modo === "manual" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
              {re.estado_modo === "manual" ? "Ajuste manual" : "Actualización automática"}
            </span>
            {dueBadge && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${dueBadge.cls}`}>
                {dueBadge.label}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {STATUS_DESCRIPTIONS[re.estado] ?? currentMeta.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {re.estado_modo === "manual"
              ? "Este estado se mantendrá hasta que vuelvas al cálculo automático o cargues un nuevo documento."
              : "FichaEleam lo mantiene al día según el documento actual y su fecha de vencimiento."}
          </p>
          {re.estado_modo === "manual" && re.estado_manual_motivo && <p className="mt-1 text-xs font-medium text-violet-800">Motivo: {re.estado_manual_motivo}</p>}
          {re.fecha_vencimiento && (
            <p className="mt-1 text-xs text-slate-500">
              Fecha de vencimiento: {formatDate(re.fecha_vencimiento)}
            </p>
          )}
        </div>
        {canEdit && <div className="flex w-full flex-col gap-2 sm:w-auto">
          <Button type="button" onClick={() => setOpen((value) => !value)} disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50">
            {open ? "Cerrar ajuste" : re.estado_modo === "manual" ? "Cambiar ajuste" : "Ajustar manualmente"}
          </Button>
          {re.estado_modo === "manual" && <button type="button" disabled={busy} onClick={restoreAutomatic} className="min-h-9 text-xs font-semibold text-teal-700 hover:underline disabled:opacity-50">Volver a actualización automática</button>}
        </div>}
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
              <p className="text-xs text-slate-500">Este ajuste tendrá prioridad sobre la fecha del documento hasta que vuelvas al modo automático.</p>
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

          {selected && selected !== "no_aplica" && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-violet-700">Motivo del ajuste *</label>
              <textarea required rows={2} value={manualReason} onChange={(event) => setManualReason(event.target.value)} className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm" placeholder="Ej. revisión interna pendiente o antecedente verificado fuera de la plataforma." />
              <p className="mt-1 text-xs leading-5 text-violet-800">Quedará asociado a tu nombre para explicar por qué se reemplazó temporalmente el cálculo automático.</p>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelected("");
                setNaMotivo("");
                setManualReason("");
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
  const [fileError, setFileError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const today = chileDateKey();
  const validityPreview = requiereVenc && !fechaVencimiento
    ? null
    : getDocumentValidity({ vigente: true, fecha_vencimiento: fechaVencimiento || null }, today);

  const resetForm = () => {
    setFile(null);
    setFileError(null);
    setFechaEmision("");
    setFechaVencimiento("");
    setNotas("");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = (nextFile) => {
    if (!nextFile) {
      setFile(null);
      setFileError(null);
      return;
    }
    const err = validateFile(nextFile);
    if (err) {
      toast(err, "error");
      setFileError({
        message: err,
        tooLarge: nextFile.size > MAX_EVIDENCE_FILE_SIZE_BYTES,
      });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFileError(null);
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
    if (fechaEmision && fechaEmision > today) return toast("La fecha de emisión no puede estar en el futuro.", "error");
    if (fechaEmision && fechaVencimiento && fechaVencimiento < fechaEmision) return toast("La fecha de vencimiento no puede ser anterior a la emisión.", "error");
    setBusy(true);
    try {
      await uploadEvidence({
        reId,
        file,
        fechaEmision,
        fechaVencimiento,
        notas,
      });
      toast(validityPreview?.status === "vencido"
        ? "Documento guardado. Como su vigencia terminó, el punto quedó marcado como vencido."
        : hasVigente ? "Documento reemplazado y estado actualizado automáticamente." : "Documento subido y estado actualizado automáticamente.",
      validityPreview?.status === "vencido" ? "info" : "success");
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
                  setFileError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-white"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
        {fileError && (
          <div role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-900">
            <p className="font-semibold">{fileError.message}</p>
            {fileError.tooLarge && (
              <p className="mt-1 text-xs leading-5 text-rose-800">
                Si es PDF, puedes usar <a href="https://www.ilovepdf.com/es/comprimir_pdf" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2 hover:text-rose-950">iLovePDF</a>: selecciona el archivo, comprímelo, descárgalo y vuelve a subirlo.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase font-semibold text-teal-700 mb-1 block">Fecha emisión</label>
          <Input type="date" value={fechaEmision} max={today} onChange={(e) => setFechaEmision(e.target.value)} />
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
            min={fechaEmision || undefined}
          />
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${validityPreview?.status === "vencido" ? "border-rose-200 bg-rose-50 text-rose-900" : validityPreview?.status === "por_vencer" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
        <p className="text-xs font-bold uppercase tracking-wide">Estado al guardar</p>
        <p className="mt-1 text-sm font-semibold">
          {!validityPreview
            ? "Indica la fecha de vencimiento para calcular el estado."
            : validityPreview.status === "vencido"
              ? "El documento ya está vencido: se conservará, pero no marcará cumplimiento."
              : fechaVencimiento
                ? `Respaldo listo hasta el ${formatDateOnly(fechaVencimiento)}.`
                : "Respaldo listo, sin fecha de vencimiento."}
        </p>
        <p className="mt-1 text-xs leading-5">FichaEleam actualizará el punto automáticamente según esta fecha. Podrás ajustarlo manualmente si existe una situación excepcional.</p>
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
  const validity = getDocumentValidity(doc);
  const validityClass = {
    vigente: "bg-emerald-100 text-emerald-700",
    por_vencer: "bg-amber-100 text-amber-800",
    vencido: "bg-rose-100 text-rose-800",
    historico: "bg-slate-100 text-slate-600",
    desconocido: "bg-slate-100 text-slate-700",
  }[validity.status];
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400">
            v{doc.version}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${validityClass}`}>
            {isVigente ? validity.label : "Histórico"}
          </span>
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
  const { profile, isAdminEleam, can, canFeature } = useAuth();

  const [re, setRe] = useState(null);
  const [docs, setDocs] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [audit, setAudit] = useState([]);
  const [operationalEvidence, setOperationalEvidence] = useState(null);
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
      const [r, d, h, o, a, evidence] = await Promise.all([
        getRequisitoEleam(id),
        getDocumentos(id),
        getDocumentos(id, { incluirHistoria: true }),
        getObservaciones({ requisitoEleamId: id }),
        getAuditTrail({ entidadId: id, limit: 30 }),
        getOperationalEvidence(),
      ]);
      setRe(r);
      setDocs(d);
      setHistorial(h);
      setObservaciones(o);
      setAudit(a);
      setOperationalEvidence(evidence.find((item) => item.requisito_codigo === r?.requisito?.codigo) ?? null);
    } catch (e) {
      toast(friendlyError(e, "No se pudo cargar el requisito. Recarga la página e intenta de nuevo."), "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStateChange = async ({ estado, noAplica, vigente, manualReason, ...payload }) => {
    try {
      if (noAplica !== undefined) {
        await marcarNoAplica(id, noAplica, manualReason);
      } else if (vigente !== undefined) {
        await marcarVigente(id, vigente, manualReason);
      } else {
        await setRequisitoEstado(id, { estado, ...payload, estado_manual_motivo: manualReason });
      }
      toast("Estado actualizado", "success");
      await loadAll();
    } catch (e) {
      toast(friendlyError(e, "No se pudo actualizar el estado. Intenta de nuevo."), "error");
    }
  };

  const handleRestoreAutomatic = async () => {
    try {
      await reactivarEstadoAutomatico(id);
      toast("Actualización automática reactivada", "success");
      await loadAll();
    } catch (error) {
      toast(friendlyError(error, "No se pudo reactivar el cálculo automático."), "error");
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
  const requiresDocument = r.tipo_evidencia === "documento" || r.tipo_evidencia === "mixta";
  const vigente = docs[0] ?? null;
  const canEditStatus = isAdminEleam || can("editar_acreditacion");
  const preparedItem = {
    ...re,
    operationalEvidence,
    openObservations: observaciones.filter((item) => item.estado !== "cerrada").length,
    documentos: docs,
  };
  const evidence = evidencePresentation(preparedItem);
  const canOpenOperationalSource = operationalEvidence?.ruta_origen && (
    operationalEvidence.ruta_origen.startsWith("/residents") || operationalEvidence.ruta_origen.startsWith("/operacion")
      ? canFeature("residents")
      : operationalEvidence.ruta_origen.startsWith("/personal")
        ? canFeature("personnel")
        : operationalEvidence.ruta_origen.startsWith("/establecimiento")
          ? canFeature("establishment")
          : canFeature("compliance")
  );

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

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200" aria-labelledby="preparation-title">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 id="preparation-title" className="font-bold text-slate-900">Cómo preparar este punto</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Separa lo que FichaEleam puede demostrar de aquello que debes obtener o comprobar fuera de la plataforma.</p>
          </div>
          <div className="grid gap-px bg-slate-200 md:grid-cols-3">
            <GuideColumn label="1. Qué pide el DS20" text={r.descripcion || "Revisa el alcance indicado para este requisito."} />
            <GuideColumn label="2. Qué aporta FichaEleam" text={operationalEvidence?.detalle || evidence.help} tone={evidence.kind} />
            <GuideColumn label="3. Qué debes conservar" text={r.medio_verificador || "Mantén un respaldo trazable y disponible para revisión."} />
          </div>
          <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <span className="font-bold">Siguiente acción:</span> {requirementNextAction(preparedItem)}
          </div>
        </section>

        {operationalEvidence && (
          <section className={`mt-4 rounded-xl border p-4 ${operationalEvidence.completa_requisito ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wide ${operationalEvidence.completa_requisito ? "text-emerald-700" : "text-sky-700"}`}>
                  {operationalEvidence.completa_requisito ? "Medio verificador desde FichaEleam" : "Avance operativo desde FichaEleam"}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{operationalEvidence.resumen}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {operationalEvidence.denominador > 0 ? `${operationalEvidence.numerador} de ${operationalEvidence.denominador} · ${operationalEvidence.porcentaje}%` : "Aún no hay datos suficientes para calcularlo."}
                </p>
              </div>
              {canOpenOperationalSource && (
                <button type="button" onClick={() => navigate(operationalEvidence.ruta_origen)} className="min-h-10 shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50">
                  Completar registros →
                </button>
              )}
            </div>
            {!operationalEvidence.completa_requisito && <p className="mt-3 text-xs font-semibold text-sky-800">Este avance no completa por sí solo el requisito: revisa también el respaldo complementario.</p>}
          </section>
        )}

        <div className="mt-5">
          <StateActions re={re} onChange={handleStateChange} onRestoreAutomatic={handleRestoreAutomatic} canEdit={canEditStatus} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailTile
            label="Documento actual"
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
              <p className="text-slate-500">Aún no hay un documento actual.</p>
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
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">Respaldo que debes tener disponible</p>
            <p className="text-sm text-teal-900">{r.medio_verificador}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailTile label="Norma">
            <p className="font-semibold">{r.norma_codigo ?? "DS20"}</p>
            <p className="mt-0.5 text-xs text-slate-500">{r.articulo_ref ?? "Sin artículo asociado"}</p>
            {r.fuente_url && <a href={r.fuente_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-teal-700 hover:underline">Texto oficial ↗</a>}
          </DetailTile>
          <DetailTile label="Cómo se respalda">
            <p className="font-semibold">{evidence.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{r.tipo_evidencia === "registro" ? "Registro trazable" : "Documento o archivo"}</p>
          </DetailTile>
          <DetailTile label="Revisión recomendada">
            <p>{r.requiere_vencimiento ? "Registra la fecha que indique el respaldo y reemplázalo al vencer." : "Revísalo cuando cambie la operación o el documento de origen."}</p>
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
          {requiresDocument && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
              <p className="font-bold">La vigencia se mantiene automáticamente</p>
              <p>Al cargar un documento, este punto quedará preparado mientras su fecha esté vigente. En la fecha de vencimiento cambiará a <strong>Vencido</strong>. Si necesitas una excepción, usa el ajuste manual del estado.</p>
            </div>
          )}

          {can("subir_acreditacion") && requiresDocument && (
            <UploadForm
              reId={id}
              requiereVenc={r.requiere_vencimiento}
              hasVigente={Boolean(vigente)}
              onUploaded={loadAll}
            />
          )}

          {!requiresDocument && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><p className="font-bold">Este punto se demuestra con registros de FichaEleam</p><p>Completa la fuente indicada arriba. No necesitas subir un documento para cambiar su avance automático.</p></div>}

          {docs.length === 0 && requiresDocument ? (
            <div className="bg-white border border-slate-100 rounded-xl p-6 text-center text-slate-500">
              Aún no hay evidencias cargadas para este requisito.
            </div>
          ) : docs.length > 0 ? (
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
          ) : null}

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

function GuideColumn({ label, text, tone = "document" }) {
  const toneClass = {
    verified: "bg-emerald-50",
    supported: "bg-sky-50",
    document: "bg-white",
  }[tone] ?? "bg-white";
  return (
    <div className={`p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}
