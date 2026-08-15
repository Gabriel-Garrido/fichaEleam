import { useEffect, useRef, useState } from "react";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { todayIso } from "../../utils/dateUtils";
import {
  createUploadedResidentConsent,
  MAX_CONSENT_DOCUMENT_SIZE_BYTES,
  validateConsentDocument,
} from "./ds20Service";

const emptyForm = (resident) => ({
  fecha_consentimiento: todayIso(),
  firmante_nombre: `${resident?.nombre ?? ""} ${resident?.apellido ?? ""}`.trim(),
  firmante_tipo: "residente",
  relacion_residente: "",
  observaciones: "",
});

export default function UploadConsentModal({ isOpen, onClose, resident, eleam, onSaved }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [form, setForm] = useState(() => emptyForm(resident));
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm(resident));
    setFile(null);
    setFileError("");
    setConfirmed(false);
    setSaving(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [isOpen, resident]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const isThirdParty = form.firmante_tipo !== "residente";
  const canSave = Boolean(
    file
    && form.fecha_consentimiento
    && form.firmante_nombre.trim()
    && (!isThirdParty || form.relacion_residente.trim())
    && confirmed,
  );

  const selectFile = (nextFile) => {
    const error = validateConsentDocument(nextFile);
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
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const saved = await createUploadedResidentConsent({
        resident,
        eleam,
        file,
        consent: {
          ...form,
          acepta_ingreso_voluntario: true,
          acepta_derechos_deberes: true,
          acepta_reglamento_interno: true,
        },
      });
      toast("Consentimiento firmado subido correctamente.", "success");
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      toast(error.message || "No se pudo subir el consentimiento.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? undefined : onClose} title="Subir consentimiento firmado" panelClassName="max-w-2xl p-4 sm:p-6" closeOnBackdrop={!saving}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          Usa esta opción si el residente ya cuenta con un consentimiento firmado. El PDF quedará guardado en su carpeta personal.
        </div>

        <div>
          <label htmlFor={`consent-upload-${resident?.id}`} className="block text-sm font-semibold text-slate-700">Consentimiento firmado en PDF</label>
          <input
            ref={inputRef}
            id={`consent-upload-${resident?.id}`}
            type="file"
            accept="application/pdf,.pdf"
            disabled={saving}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700"
          />
          <p className="mt-1 text-xs text-slate-500">Solo PDF, máximo {MAX_CONSENT_DOCUMENT_SIZE_BYTES / 1024 / 1024} MB.</p>
          {file && <p className="mt-2 text-xs font-semibold text-teal-700">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
          {fileError && (
            <div role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <p className="font-semibold">{fileError}</p>
              {fileError.includes("10 MB") && <p className="mt-1 text-xs">Puedes <a href="https://www.ilovepdf.com/es/comprimir_pdf" target="_blank" rel="noreferrer" className="font-bold underline">comprimirlo en iLovePDF</a> y volver a subirlo.</p>}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Fecha del consentimiento
            <input type="date" value={form.fecha_consentimiento} max={todayIso()} onChange={(event) => set({ fecha_consentimiento: event.target.value })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Tipo de firmante
            <select value={form.firmante_tipo} onChange={(event) => set({ firmante_tipo: event.target.value, relacion_residente: "" })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="residente">Residente</option>
              <option value="representante_legal">Representante legal</option>
              <option value="familiar_responsable">Familiar responsable</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Nombre de quien firmó
            <input value={form.firmante_nombre} onChange={(event) => set({ firmante_nombre: event.target.value })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          {isThirdParty && (
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Relación con el residente
              <input value={form.relacion_residente} onChange={(event) => set({ relacion_residente: event.target.value })} disabled={saving} placeholder="Ej. hijo/a, curador/a, apoderado/a" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
          )}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Observaciones <span className="font-normal text-slate-400">(opcional)</span>
          <textarea rows={2} value={form.observaciones} onChange={(event) => set({ observaciones: event.target.value })} disabled={saving} className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={saving} className="mt-1 h-4 w-4 accent-teal-700" />
          <span>Confirmo que el archivo está firmado y deja constancia del ingreso voluntario, la entrega de derechos y deberes y el reglamento interno.</span>
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
          <button type="button" onClick={save} disabled={!canSave || saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? "Subiendo..." : "Guardar consentimiento"}</button>
        </div>
      </div>
    </Modal>
  );
}
