import { useEffect, useRef, useState } from "react";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { todayIso } from "../../utils/dateUtils";
import {
  MAX_PRESCRIPTION_FILE_SIZE_BYTES,
  uploadMedicationPrescription,
  validatePrescriptionFile,
} from "./emarService";

export default function MedicationPrescriptionModal({ indication, residentId, onClose, onSaved }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [fechaEmision, setFechaEmision] = useState(todayIso());
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!indication) return;
    setFile(null);
    setFileError("");
    setFechaEmision(indication.fecha_indicacion || todayIso());
    setFechaVencimiento("");
    setObservaciones("");
    setConfirmed(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [indication]);

  const selectFile = (nextFile) => {
    const error = validatePrescriptionFile(nextFile);
    if (error) {
      setFile(null);
      setFileError(error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile);
    setFileError("");
  };

  const save = async () => {
    if (!file || !fechaEmision || !confirmed || saving) return;
    setSaving(true);
    try {
      await uploadMedicationPrescription({
        residenteId: residentId,
        indicacion: indication,
        file,
        fechaEmision,
        fechaVencimiento,
        observaciones,
      });
      toast("Receta guardada en la carpeta de medicamentos.", "success");
      await onSaved?.();
      onClose?.();
    } catch (error) {
      toast(error.message || "No se pudo guardar la receta.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={Boolean(indication)} onClose={saving ? undefined : onClose} title="Adjuntar receta médica" panelClassName="max-w-2xl p-4 sm:p-6" closeOnBackdrop={!saving}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <p className="font-bold">{indication?.medicamento_nombre}</p>
          <p>La receta quedará asociada a esta indicación y se conservará junto a las recetas anteriores para mantener el historial.</p>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Archivo de la receta
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" disabled={saving} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700" />
          <span className="mt-1 block text-xs font-normal text-slate-500">PDF, JPG, PNG o WEBP · máximo {MAX_PRESCRIPTION_FILE_SIZE_BYTES / 1024 / 1024} MB.</span>
        </label>
        {file && <p className="text-xs font-semibold text-teal-700">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
        {fileError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><p className="font-semibold">{fileError}</p>{fileError.includes("3 MB") && <p className="mt-1 text-xs">Si es PDF, <a href="https://www.ilovepdf.com/es/comprimir_pdf" target="_blank" rel="noreferrer" className="font-bold underline">comprímelo en iLovePDF</a> y vuelve a seleccionarlo. Si es una imagen, reduce su resolución o calidad.</p>}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Fecha de emisión<input type="date" value={fechaEmision} max={todayIso()} onChange={(event) => setFechaEmision(event.target.value)} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">Vencimiento <span className="font-normal text-slate-400">(si la receta lo indica)</span><input type="date" value={fechaVencimiento} min={fechaEmision} onChange={(event) => setFechaVencimiento(event.target.value)} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Observaciones <span className="font-normal text-slate-400">(opcional)</span><textarea rows={2} maxLength={500} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={saving} className="mt-1 h-4 w-4 accent-teal-700" /><span>Confirmo que el documento corresponde a este residente, medicamento y prescriptor.</span></label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="button" onClick={save} disabled={!file || !fechaEmision || !confirmed || saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? "Guardando..." : "Guardar receta"}</button></div>
      </div>
    </Modal>
  );
}
