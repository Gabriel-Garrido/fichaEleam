export const DS20_LEGAL_CONTEXT = {
  effectiveFrom: "1 de octubre de 2025",
  generalTransitionDeadline: "1 de octubre de 2028",
  fireTransitionDeadline: "1 de octubre de 2030",
  sourceUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1182129",
};

export const COMPLIANCE_FILTERS = [
  { id: "priority", label: "Qué resolver ahora" },
  { id: "fichaeleam", label: "FichaEleam aporta" },
  { id: "documents", label: "Documentos por reunir" },
  { id: "all", label: "Ver todo" },
];

export function evidencePresentation(item) {
  const calculated = item?.operationalEvidence;
  if (calculated?.completa_requisito) {
    return {
      kind: "verified",
      label: "Verificado con FichaEleam",
      shortLabel: "FichaEleam verifica",
      help: "Este punto se calcula con registros estructurados del establecimiento. Mantén esos registros completos y vigentes.",
    };
  }
  if (calculated) {
    return {
      kind: "supported",
      label: "FichaEleam aporta parte del respaldo",
      shortLabel: "Apoyo de FichaEleam",
      help: "La plataforma muestra avance operativo, pero debes revisar y conservar los documentos o comprobaciones físicas indicadas.",
    };
  }
  return {
    kind: "document",
    label: "Requiere respaldo externo",
    shortLabel: "Documento externo",
    help: "Este antecedente no se genera dentro de FichaEleam. Debes obtenerlo, revisarlo y cargar su versión vigente.",
  };
}

export function requirementNextAction(item) {
  if (item?.estado === "no_aplica") return "Conservar el motivo y revisarlo si cambia la situación del ELEAM.";
  if ((item?.openObservations ?? 0) > 0 || ["observado", "no_cumple"].includes(item?.estado)) {
    return "Resolver la observación y adjuntar evidencia de la corrección.";
  }
  const calculated = item?.operationalEvidence;
  if (calculated?.estado_calculado === "incompleto") {
    return calculated.detalle || "Completar los registros faltantes en FichaEleam.";
  }
  if (calculated?.estado_calculado === "sin_datos") {
    return "Registrar la información base en FichaEleam para poder evaluar este punto.";
  }
  if (item?.estado === "vencido") return "Reemplazar el respaldo vencido y registrar la fecha indicada por el documento.";
  if (item?.estado === "requiere_actualizacion") return "Actualizar el respaldo o confirmar que los registros siguen representando la operación actual.";
  if (item?.estado === "en_revision") return "Terminar la revisión interna y confirmar si el respaldo satisface el requisito.";
  const hasDocument = (item?.documentos ?? []).some((document) => document.vigente);
  if (hasDocument && item?.estado === "pendiente") return "Revisar el archivo cargado y confirmar su estado.";
  const evidence = evidencePresentation(item);
  if (evidence.kind === "document") return "Obtener y cargar el respaldo esperado.";
  if (evidence.kind === "supported") return "Completar los registros de FichaEleam y reunir el respaldo complementario.";
  return "Mantener los registros al día y revisar este punto cuando cambie la operación.";
}

export function requirementMatchesFilter(item, filter) {
  if (filter === "all") return true;
  const evidence = evidencePresentation(item);
  if (filter === "fichaeleam") return evidence.kind !== "document";
  if (filter === "documents") {
    return item?.estado !== "no_aplica"
      && evidence.kind !== "verified"
      && !(item?.documentos ?? []).some((document) => document.vigente);
  }
  return !item?.effectiveReady;
}

export function summarizeEvidence(areas = []) {
  const items = areas.flatMap((area) => area.items ?? []);
  return items.reduce((summary, item) => {
    const kind = evidencePresentation(item).kind;
    summary[kind] += 1;
    if (!item.effectiveReady && item.requisito?.criticidad === "critica") summary.criticalPending += 1;
    return summary;
  }, { verified: 0, supported: 0, document: 0, criticalPending: 0 });
}

export function filterComplianceAreas(areas = [], filter = "priority") {
  return areas
    .map((area) => {
      const items = area.items.filter((item) => requirementMatchesFilter(item, filter));
      const ready = items.filter((item) => item.effectiveReady).length;
      const compliant = items.filter((item) => item.effectiveCompliant).length;
      const notApplicable = items.filter((item) => item.estado === "no_aplica").length;
      const applicable = items.length - notApplicable;
      return {
        ...area,
        items,
        ready,
        compliant,
        notApplicable,
        pending: items.length - ready,
        overdue: items.filter((item) => item.estado === "vencido").length,
        observed: items.filter((item) => item.openObservations > 0 || ["observado", "no_cumple"].includes(item.estado)).length,
        percentage: items.length === 0 ? 0 : applicable > 0 ? Math.round((compliant / applicable) * 100) : 100,
      };
    })
    .filter((area) => area.items.length > 0);
}
