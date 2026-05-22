import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import { downloadExcelTemplate, readExcelRows } from "./excelWorkbook";

function StatusPill({ tone, label, value }) {
  const tones = {
    teal: "bg-teal-50 text-teal-800 border-teal-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] ?? tones.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-bold text-teal-700 shadow-sm">
        {number}
      </div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function ResultList({ results, renderResultDetail }) {
  const failures = results.filter((r) => !r.ok);
  const success = results.filter((r) => r.ok);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatusPill tone="teal" label="Creados" value={success.length} />
        <StatusPill tone={failures.length ? "rose" : "slate"} label="Con error" value={failures.length} />
      </div>

      {success.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">Importación completada</p>
          <p className="mt-1 text-sm text-emerald-800">
            Los registros creados ya quedaron disponibles en el módulo.
          </p>
          {renderResultDetail?.(success)}
        </div>
      )}

      {failures.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-900">Filas que no se pudieron crear</p>
          <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {failures.map((item) => (
              <li key={`${item.rowNumber}-${item.label}`} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-800">
                <span className="font-semibold">Fila {item.rowNumber}:</span> {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  config,
  normalizeRows,
  normalizeContext,
  onImport,
  onComplete,
  renderResultDetail,
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setFileName("");
    setRows([]);
    setFileError("");
    setParsing(false);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setResults([]);
  }, [isOpen]);

  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => row.errors.length > 0), [rows]);
  const canImport = validRows.length > 0 && invalidRows.length === 0 && !importing;

  const handleDownload = async () => {
    setTemplateLoading(true);
    setFileError("");
    try {
      await downloadExcelTemplate(config);
    } catch (error) {
      setFileError(error?.message || "No se pudo descargar la planilla.");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? "");
    setRows([]);
    setResults([]);
    setFileError("");
    if (!file) return;

    setParsing(true);
    try {
      const parsedRows = await readExcelRows(file, config);
      const normalized = normalizeRows(parsedRows, normalizeContext);
      if (normalized.length === 0) {
        setFileError("La planilla no tiene filas con datos. Completa al menos una fila antes de subirla.");
      }
      setRows(normalized);
    } catch (error) {
      setFileError(error?.message || "No se pudo leer la planilla.");
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setFileError("");
    setProgress({ done: 0, total: validRows.length });
    try {
      const nextResults = await onImport(validRows, (done, total) => setProgress({ done, total }));
      setResults(nextResults);
      onComplete?.(nextResults);
    } catch (error) {
      setFileError(error?.message || "No se pudo completar la importación.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={importing ? () => {} : onClose} panelClassName="max-w-5xl p-0">
      <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Importación masiva</p>
        <h2 className="mt-1 pr-8 text-xl font-bold text-slate-900">{config.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Descarga la plantilla, completa los datos y sube el archivo. Antes de crear registros revisaremos formato, duplicados y campos obligatorios.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.85fr_1.15fr] sm:p-6">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Step number="1" title="Descarga" text="Usa la planilla oficial para mantener columnas y formatos correctos." />
            <Step number="2" title="Completa" text="Una fila por registro. No elimines títulos ni mezcles residentes con funcionarios." />
            <Step number="3" title="Revisa" text="Sube el archivo y corrige las filas marcadas antes de importar." />
          </div>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={templateLoading || importing}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {templateLoading ? "Preparando planilla..." : "Descargar planilla excel"}
          </Button>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-sm font-bold text-slate-800">Columnas obligatorias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {config.columns.filter((c) => c.required).map((column) => (
                <span key={column.key} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {column.header}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Solo se aceptan archivos `.xlsx`. Si Excel muestra advertencias de formato, guarda el archivo como Libro de Excel antes de subirlo.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition-colors hover:border-teal-300 hover:bg-teal-50/40">
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={parsing || importing}
              onChange={handleFile}
            />
            <svg className="mx-auto h-10 w-10 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L7 9m5-5 5 5M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5" />
            </svg>
            <p className="mt-3 text-sm font-bold text-slate-800">
              {parsing ? "Leyendo planilla..." : fileName || "Subir planilla completada"}
            </p>
            <p className="mt-1 text-xs text-slate-500">La revisión se hace antes de crear datos para evitar registros incompletos.</p>
          </label>

          {fileError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {fileError}
            </div>
          )}

          {rows.length > 0 && !results.length && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatusPill tone="slate" label="Leídas" value={rows.length} />
                <StatusPill tone="teal" label="Listas" value={validRows.length} />
                <StatusPill tone={invalidRows.length ? "rose" : "slate"} label="Revisar" value={invalidRows.length} />
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-bold text-rose-900">Corrige estas filas y vuelve a subir la planilla</p>
                  <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {invalidRows.slice(0, 12).map((row) => (
                      <li key={row.rowNumber} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-800">
                        <span className="font-semibold">Fila {row.rowNumber}:</span> {row.errors.join(" ")}
                      </li>
                    ))}
                  </ul>
                  {invalidRows.length > 12 && (
                    <p className="mt-2 text-xs text-rose-700">Hay {invalidRows.length - 12} filas adicionales con errores.</p>
                  )}
                </div>
              )}

              {validRows.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-bold text-slate-800">Vista previa</p>
                  <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Fila</th>
                          <th className="px-3 py-2">Registro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validRows.slice(0, 8).map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={!canImport}
                  className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {importing ? `Importando ${progress.done}/${progress.total}` : `${config.primaryAction} (${validRows.length})`}
                </Button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <ResultList results={results} renderResultDetail={renderResultDetail} />
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
