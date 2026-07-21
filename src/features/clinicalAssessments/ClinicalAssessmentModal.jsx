import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly } from "../../utils/dateUtils";
import {
  ASSESSMENT_LABEL,
  ASSESSMENT_HELP,
  BARTHEL_ITEMS,
  KATZ_ITEMS,
  MNA_ITEMS,
  MMSE_ITEMS,
  TINETTI_EQUILIBRIO_ITEMS,
  TINETTI_MARCHA_ITEMS,
  MOTIVO_OPTIONS,
  computeAssessment,
  computeNextEvaluation,
  getKatzOptions,
  getItems,
  isAssessmentItemComplete,
  isAssessmentComplete,
} from "./clinicalAssessmentRules";
import { submitAssessment } from "./clinicalAssessmentService";

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const tone = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-500">{done}/{total}</span>
    </div>
  );
}

function ItemOption({ name, value, current, label, onChange, disabled }) {
  const active = String(current) === String(value);
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors ${
        active ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={String(value)}
        checked={active}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 accent-teal-600"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function BarthelItem({ item, value, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
        {item.help && (
          <HelpTooltip label={`Ayuda: ${item.label}`}>{item.help}</HelpTooltip>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((opt) => (
          <ItemOption
            key={opt.value}
            name={`barthel_${item.key}`}
            value={opt.value}
            current={value}
            label={`${opt.label} · ${opt.value} pts`}
            disabled={disabled}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function KatzItem({ item, value, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
        {item.help && (
          <HelpTooltip label={`Ayuda: ${item.label}`}>{item.help}</HelpTooltip>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {getKatzOptions().map((opt) => (
          <ItemOption
            key={opt.value}
            name={`katz_${item.key}`}
            value={opt.value}
            current={value}
            label={opt.label}
            disabled={disabled}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function MnaItem({ item, value, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
        {item.help && (
          <HelpTooltip label={`Ayuda: ${item.label}`}>{item.help}</HelpTooltip>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((opt) => (
          <ItemOption
            key={opt.value}
            name={`mna_${item.key}`}
            value={opt.value}
            current={value}
            label={`${opt.label} · ${opt.value} pts`}
            disabled={disabled}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function TinettiItem({ item, value, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
        {item.help && (
          <HelpTooltip label={`Ayuda: ${item.label}`}>{item.help}</HelpTooltip>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((opt) => (
          <ItemOption
            key={opt.value}
            name={`tinetti_${item.key}`}
            value={opt.value}
            current={value}
            label={`${opt.label} · ${opt.value} pts`}
            disabled={disabled}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function MmseItem({ item, value, onChange, disabled }) {
  const id = `mmse_${item.key}`;
  return (
    <label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" htmlFor={id}>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{item.label}</span>
        {item.help && <HelpTooltip label={`Ayuda: ${item.label}`}>{item.help}</HelpTooltip>}
      </span>
      <span className="mt-1 block text-xs text-slate-500">Máximo {item.max} puntos</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="0"
        max={item.max}
        step="1"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const EMPTY_DETAILS = {};

export default function ClinicalAssessmentModal({ isOpen, onClose, resident, tipo, onSuccess }) {
  const toast = useToast();
  const { can } = useAuth();
  const items = useMemo(() => getItems(tipo), [tipo]);
  const [detalle, setDetalle] = useState(EMPTY_DETAILS);
  const [motivo, setMotivo] = useState("rutina");
  const [fecha, setFecha] = useState(todayIso());
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  const canApply = can("aplicar_evaluaciones_clinicas");

  useEffect(() => {
    if (!isOpen) return;
    setDetalle({});
    setMotivo("rutina");
    setFecha(todayIso());
    setObservaciones("");
    setSaving(false);
  }, [isOpen, tipo, resident?.id]);

  const completedCount = useMemo(() => {
    return items.filter((item) => isAssessmentItemComplete(tipo, item, detalle)).length;
  }, [detalle, items, tipo]);

  const complete = isAssessmentComplete(tipo, detalle);
  const { puntaje, resultado } = useMemo(
    () => (complete ? computeAssessment(tipo, detalle) : { puntaje: null, resultado: null }),
    [complete, tipo, detalle]
  );
  const proxima = useMemo(() => computeNextEvaluation(fecha, motivo), [fecha, motivo]);

  const handleSubmit = async () => {
    if (!complete) {
      toast("Responde todas las preguntas antes de guardar.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await submitAssessment({
        residenteId: resident.id,
        tipo,
        detalle,
        motivo,
        observaciones: observaciones.trim() || null,
        fechaEvaluacion: fecha,
      });
      toast(`${ASSESSMENT_LABEL[tipo]} registrado. Próxima evaluación: ${formatDateOnly(saved.proxima_evaluacion)}.`, "success");
      onSuccess?.(saved);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar la evaluación.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose?.()}
      title={`Aplicar ${ASSESSMENT_LABEL[tipo]}`}
      panelClassName="max-w-3xl p-4 sm:p-6"
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <header className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Residente
              </p>
              <p className="text-base font-semibold text-slate-900">
                {resident?.nombre} {resident?.apellido}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Próxima evaluación
              </p>
              <p className="text-base font-semibold text-slate-900">
                {formatDateOnly(proxima)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-teal-900/80">
            {ASSESSMENT_HELP[tipo]}
          </p>
        </header>

        {!canApply && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Solo lectura: un administrador debe habilitar el permiso "Aplicar evaluaciones" en Gestión de equipo.
          </div>
        )}

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Fecha de evaluación
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              max={todayIso()}
              disabled={saving || !canApply}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              Motivo
              <HelpTooltip label="Ayuda: motivo de la evaluación">
                El motivo define cada cuánto se reevalúa: control de rutina cada 6 meses; post-hospitalización 7 días; caída 14 días; cambio clínico o solicitud médica 30 días; ingreso 30 días.
              </HelpTooltip>
            </span>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={saving || !canApply}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {MOTIVO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {MOTIVO_OPTIONS.find((m) => m.value === motivo)?.help}
            </span>
          </label>
        </section>

        <div className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Progreso
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {complete ? (
                <>
                  {tipo === "barthel" ? <>{puntaje} / 100 pts · </> : null}
                  {tipo === "mna" ? <>{computeAssessment(tipo, detalle).puntajeDecimal ?? puntaje} / 30 pts · </> : null}
                  {tipo === "mmse" ? <>{puntaje} / 30 pts · </> : null}
                  {tipo === "tinetti" ? (
                    <>
                      {computeAssessment(tipo, detalle).puntaje} / 28 pts ·{" "}
                    </>
                  ) : null}
                  {resultado}
                </>
              ) : (
                "Responde todas las preguntas"
              )}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar done={completedCount} total={items.length} />
          </div>
        </div>

        <div className="space-y-3">
          {tipo === "barthel" && BARTHEL_ITEMS.map((item) => (
            <BarthelItem
              key={item.key}
              item={item}
              value={detalle[item.key]}
              disabled={saving || !canApply}
              onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
            />
          ))}
          {tipo === "katz" && KATZ_ITEMS.map((item) => (
            <KatzItem
              key={item.key}
              item={item}
              value={detalle[item.key]}
              disabled={saving || !canApply}
              onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
            />
          ))}
          {tipo === "mna" && MNA_ITEMS.map((item) => (
            <MnaItem
              key={item.key}
              item={item}
              value={detalle[item.key]}
              disabled={saving || !canApply}
              onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
            />
          ))}
          {tipo === "mmse" && MMSE_ITEMS.map((item) => (
            <MmseItem
              key={item.key}
              item={item}
              value={detalle[item.key]}
              disabled={saving || !canApply}
              onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
            />
          ))}
          {tipo === "tinetti" && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="rounded-full bg-teal-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-700">
                  Parte A — Equilibrio
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              {TINETTI_EQUILIBRIO_ITEMS.map((item) => (
                <TinettiItem
                  key={item.key}
                  item={item}
                  value={detalle[item.key]}
                  disabled={saving || !canApply}
                  onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
                />
              ))}
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="rounded-full bg-teal-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-700">
                  Parte B — Marcha
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              {TINETTI_MARCHA_ITEMS.map((item) => (
                <TinettiItem
                  key={item.key}
                  item={item}
                  value={detalle[item.key]}
                  disabled={saving || !canApply}
                  onChange={(value) => setDetalle((prev) => ({ ...prev, [item.key]: value }))}
                />
              ))}
            </>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Observaciones (opcional)
          <textarea
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={saving || !canApply}
            placeholder="Cambios desde la última evaluación, contexto clínico, factores relevantes…"
            className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => !saving && onClose?.()}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !complete || !canApply}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar evaluación"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
