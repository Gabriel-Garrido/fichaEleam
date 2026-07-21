import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { todayIso } from "../../utils/dateUtils";
import { formatRut, validateRut } from "../../utils/validators";
import { generateConsentPdf, preloadConsentPdf } from "./consentPdf";
import { createResidentConsent } from "./ds20Service";

const INITIAL_FORM = {
  fecha_consentimiento: todayIso(),
  firmante_nombre: "",
  firmante_rut: "",
  firmante_tipo: "residente",
  relacion_residente: "",
  observaciones: "",
  acepta_ingreso_voluntario: false,
  acepta_derechos_deberes: false,
  acepta_reglamento_interno: false,
};

function SignaturePad({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const valueRef = useRef(value);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const drawDataUrl = useCallback((dataUrl) => {
    if (!dataUrl || !canvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(image, 0, 0, rect.width, rect.height);
      setEmpty(false);
    };
    image.src = dataUrl;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f766e";
    if (valueRef.current) {
      drawDataUrl(valueRef.current);
    } else {
      setEmpty(true);
    }
  }, [drawDataUrl]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    if (drawing.current) return;
    if (value) {
      drawDataUrl(value);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.getContext("2d").clearRect(0, 0, rect.width, rect.height);
    setEmpty(true);
  }, [drawDataUrl, value]);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (event) => {
    if (!drawing.current || disabled) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setEmpty(false);
    onChange?.(canvasRef.current.toDataURL("image/png"));
  };

  const end = (event) => {
    try {
      event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange?.("");
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label="Firma digital"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{empty ? "Firma pendiente" : "Firma registrada"}</p>
        <button type="button" onClick={clear} disabled={disabled} className="text-sm font-semibold text-teal-700 hover:underline disabled:opacity-60">
          Limpiar firma
        </button>
      </div>
    </div>
  );
}

export default function ConsentModal({ isOpen, onClose, resident, eleam, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(INITIAL_FORM);
  const [signature, setSignature] = useState("");
  const [rutError, setRutError] = useState("");
  const [saving, setSaving] = useState(false);

  const residentFullName = `${resident?.nombre ?? ""} ${resident?.apellido ?? ""}`.trim();

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...INITIAL_FORM,
      fecha_consentimiento: todayIso(),
      firmante_nombre: residentFullName,
      firmante_rut: resident?.rut ?? "",
    });
    setSignature("");
    setRutError("");
    setSaving(false);
    // El PDF se genera al guardar; precargar pdf-lib evita la espera ahí.
    preloadConsentPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resident]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const esTerceroFirmante = form.firmante_tipo !== "residente";

  // Al cambiar el tipo de firmante, los datos prellenados del residente dejan
  // de corresponder: se limpian para evitar firmar con la identidad equivocada.
  const handleTipoChange = (tipo) => {
    setRutError("");
    if (tipo === "residente") {
      set({ firmante_tipo: tipo, firmante_nombre: residentFullName, firmante_rut: resident?.rut ?? "", relacion_residente: "" });
    } else {
      set({ firmante_tipo: tipo, firmante_nombre: "", firmante_rut: "" });
    }
  };

  const handleRutBlur = () => {
    const value = form.firmante_rut.trim();
    if (!value) { setRutError(""); return; }
    if (!validateRut(value)) {
      setRutError("RUT inválido. Revisa el dígito verificador.");
      return;
    }
    setRutError("");
    set({ firmante_rut: formatRut(value) });
  };

  const missing = useMemo(() => {
    const items = [];
    if (!form.firmante_nombre.trim()) items.push("nombre del firmante");
    if (form.firmante_rut.trim() && !validateRut(form.firmante_rut)) items.push("RUT válido");
    if (esTerceroFirmante && !form.relacion_residente.trim()) items.push("relación con el residente");
    if (!(form.acepta_ingreso_voluntario && form.acepta_derechos_deberes && form.acepta_reglamento_interno)) items.push("las 3 confirmaciones");
    if (!signature) items.push("la firma");
    return items;
  }, [form, signature, esTerceroFirmante]);

  const canSave = Boolean(form.fecha_consentimiento) && missing.length === 0;

  const dirty = Boolean(signature)
    || form.acepta_ingreso_voluntario
    || form.acepta_derechos_deberes
    || form.acepta_reglamento_interno
    || form.observaciones.trim() !== "";

  const handleClose = async () => {
    if (saving) return;
    if (dirty) {
      const ok = await confirm({
        title: "Descartar consentimiento",
        message: "Se perderán la firma y las confirmaciones ingresadas en este consentimiento.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose?.();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const consentPayload = {
        ...form,
        residente_puede_firmar: form.firmante_tipo === "residente",
        firma_data_url: signature,
      };
      const pdfBlob = await generateConsentPdf({
        resident,
        eleam,
        consent: consentPayload,
        signatureDataUrl: signature,
      });
      const saved = await createResidentConsent({
        resident,
        eleam,
        consent: consentPayload,
        pdfBlob,
      });
      toast("Consentimiento guardado y PDF generado.", "success");
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo guardar el consentimiento.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Consentimiento de ingreso" panelClassName="max-w-3xl p-4 sm:p-6" closeOnBackdrop={false}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-sm font-semibold text-slate-900">{resident?.nombre} {resident?.apellido}</p>
          <p className="mt-1 text-xs leading-5 text-teal-900/80">
            Se generará un PDF privado para la carpeta personal del residente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Fecha
            <input type="date" value={form.fecha_consentimiento} max={todayIso()} onChange={(e) => set({ fecha_consentimiento: e.target.value })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Tipo de firmante
            <select value={form.firmante_tipo} onChange={(e) => handleTipoChange(e.target.value)} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
              <option value="residente">Residente</option>
              <option value="representante_legal">Representante legal</option>
              <option value="familiar_responsable">Familiar responsable</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Nombre firmante <span className="text-xs text-rose-500">*</span>
            <input
              value={form.firmante_nombre}
              onChange={(e) => set({ firmante_nombre: e.target.value })}
              disabled={saving}
              placeholder={esTerceroFirmante ? "Nombre de quien firma por el residente" : undefined}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            RUT firmante
            <input
              value={form.firmante_rut}
              onChange={(e) => { setRutError(""); set({ firmante_rut: e.target.value }); }}
              onBlur={handleRutBlur}
              disabled={saving}
              placeholder="12.345.678-9"
              aria-invalid={rutError ? "true" : "false"}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${rutError ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-teal-500 focus:ring-teal-100"}`}
            />
            {rutError && <span className="mt-1 block text-xs font-normal text-rose-600">{rutError}</span>}
          </label>
          {esTerceroFirmante && (
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Relación con el residente <span className="text-xs text-rose-500">*</span>
              <input value={form.relacion_residente} onChange={(e) => set({ relacion_residente: e.target.value })} disabled={saving} placeholder="Ej. hijo/a, curador/a, apoderado/a" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </label>
          )}
        </div>

        <div className="grid gap-2">
          {[
            ["acepta_ingreso_voluntario", "El ingreso es voluntario y fue explicado en lenguaje comprensible."],
            ["acepta_derechos_deberes", "Se informó la carta de derechos y deberes."],
            ["acepta_reglamento_interno", "Se entregó o explicó el reglamento interno del ELEAM."],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input type="checkbox" checked={form[key]} onChange={(e) => set({ [key]: e.target.checked })} disabled={saving} className="mt-0.5 h-4 w-4 accent-teal-700" />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Observaciones
          <textarea rows={3} value={form.observaciones} onChange={(e) => set({ observaciones: e.target.value })} disabled={saving} className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </label>

        <SignaturePad value={signature} onChange={setSignature} disabled={saving} />

        <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!canSave && !saving && (
              <p className="order-last text-xs leading-5 text-slate-500 sm:order-first sm:mr-auto">
                Para guardar falta: {missing.join(", ")}.
              </p>
            )}
            <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
              Cancelar
            </button>
            <button type="button" onClick={save} disabled={saving || !canSave} className="order-first w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:order-last sm:w-auto">
              {saving ? "Generando PDF..." : "Guardar consentimiento"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
