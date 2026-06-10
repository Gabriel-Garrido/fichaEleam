import { useMemo } from "react";
import ExcelImportModal from "../../import/ExcelImportModal";
import { useToast } from "../../../components/Toast";
import {
  crmProspectImportConfig,
  normalizeProspectRows,
} from "../crmProspectImportConfig";
import { bulkInsertProspects } from "../crmEmailService";

export default function ProspectImportModal({
  isOpen,
  listId,
  existingProspects = [],
  onClose,
  onImported,
}) {
  const toast = useToast();

  const normalizeContext = useMemo(() => ({ existingProspects }), [existingProspects]);

  const handleImport = async (validRows, onProgress) => {
    onProgress?.(0, validRows.length);
    const payloads = validRows
      .filter((row) => row.payload)
      .map((row) => ({
        rowNumber: row.rowNumber,
        label: row.label,
        payload: row.payload,
      }));
    const { inserted, duplicates, errors } = await bulkInsertProspects(listId, payloads);
    const duplicateRows = new Set(duplicates.map((d) => d.rowNumber));
    const errorByRow = new Map(errors.map((e) => [e.rowNumber, e]));

    const results = validRows.map((row) => {
      if (duplicateRows.has(row.rowNumber)) {
        return { rowNumber: row.rowNumber, label: row.label, ok: false, error: "Ya existe un prospecto con ese correo en la base." };
      }
      const err = errorByRow.get(row.rowNumber);
      if (err) {
        return { rowNumber: row.rowNumber, label: row.label, ok: false, error: err.message };
      }
      return { rowNumber: row.rowNumber, label: row.label, ok: true };
    });
    onProgress?.(validRows.length, validRows.length);

    const okCount = results.filter((r) => r.ok).length;
    if (okCount > 0) {
      toast(`Se importaron ${okCount} prospecto${okCount === 1 ? "" : "s"}.`, "success");
    }
    if (inserted > 0) onImported?.(inserted);
    return results;
  };

  return (
    <ExcelImportModal
      isOpen={isOpen}
      onClose={onClose}
      config={crmProspectImportConfig}
      normalizeRows={normalizeProspectRows}
      normalizeContext={normalizeContext}
      onImport={handleImport}
    />
  );
}
