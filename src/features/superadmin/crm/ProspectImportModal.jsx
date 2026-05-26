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
    const payloads = validRows.map((row) => row.payload).filter(Boolean);
    const { inserted, duplicates, errors } = await bulkInsertProspects(listId, payloads);

    const results = validRows.map((row) => {
      const dup = duplicates.find((d) => d.email && d.email === row.payload?.email);
      if (dup) {
        return { rowNumber: row.rowNumber, label: row.label, ok: false, error: "Ya existe un prospecto con ese correo en la base." };
      }
      const err = errors.find((e) => e.row?.eleam_nombre === row.payload?.eleam_nombre && e.row?.email === row.payload?.email);
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
