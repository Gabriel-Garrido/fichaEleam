export const SIMPLE_STATUS = {
  vigente: { label: "Al día", tone: "emerald", help: "El respaldo está vigente." },
  no_aplica: { label: "No corresponde", tone: "slate", help: "Este punto no aplica al establecimiento." },
  vencido: { label: "Vencido", tone: "rose", help: "El respaldo perdió vigencia y debe renovarse." },
  observado: { label: "Por corregir", tone: "orange", help: "Hay una observación que debes resolver." },
  no_cumple: { label: "Por corregir", tone: "rose", help: "Este punto necesita una corrección." },
  requiere_actualizacion: { label: "Actualizar", tone: "violet", help: "La información o el respaldo debe renovarse." },
  en_revision: { label: "En revisión", tone: "sky", help: "Falta terminar la revisión del respaldo." },
  pendiente: { label: "Pendiente", tone: "amber", help: "Falta revisar este punto o agregar su respaldo." },
};

export function simpleRequirementStatus(item) {
  const calculated = item?.operationalEvidence;
  const hasBlockingObservation = (item?.openObservations ?? 0) > 0
    || ["observado", "no_cumple"].includes(item?.estado);
  if (calculated?.completa_requisito && item?.estado !== "no_aplica" && !hasBlockingObservation) {
    if (calculated.estado_calculado === "completo") {
      return { label: "Al día", tone: "emerald", help: calculated.detalle };
    }
    if (calculated.estado_calculado === "sin_datos") {
      return { label: "Sin datos", tone: "amber", help: calculated.detalle };
    }
    return { label: "Incompleto", tone: "rose", help: calculated.detalle };
  }
  const base = SIMPLE_STATUS[item?.estado] ?? SIMPLE_STATUS.pendiente;
  const hasEvidence = (item?.documentos ?? []).some((document) => document.vigente);
  if (item?.estado === "pendiente" && hasEvidence) {
    return { ...base, help: "Hay un respaldo cargado; falta revisarlo." };
  }
  return base;
}

export function buildComplianceAreas(requirements = [], observations = [], operationalEvidence = []) {
  const evidenceByCode = new Map(
    operationalEvidence.map((evidence) => [evidence.requisito_codigo, evidence]),
  );
  const openByRequirement = new Map();
  for (const observation of observations) {
    if (observation.estado === "cerrada" || !observation.requisito_eleam_id) continue;
    openByRequirement.set(
      observation.requisito_eleam_id,
      (openByRequirement.get(observation.requisito_eleam_id) ?? 0) + 1,
    );
  }

  const areas = new Map();
  for (const item of requirements) {
    const area = item.requisito?.ambito;
    if (!area?.codigo) continue;
    if (!areas.has(area.codigo)) areas.set(area.codigo, { area, items: [] });
    const openObservations = openByRequirement.get(item.id) ?? 0;
    const evidence = evidenceByCode.get(item.requisito?.codigo) ?? null;
    const isNoApplicable = item.estado === "no_aplica";
    const isBlocked = openObservations > 0 || ["observado", "no_cumple"].includes(item.estado);
    const calculatedReady = evidence?.completa_requisito
      ? evidence.estado_calculado === "completo"
      : null;
    const effectiveReady = isNoApplicable || (!isBlocked && (
      calculatedReady === null ? item.estado === "vigente" : calculatedReady
    ));
    areas.get(area.codigo).items.push({
      ...item,
      openObservations,
      operationalEvidence: evidence,
      effectiveReady,
      effectiveCompliant: !isNoApplicable && effectiveReady,
    });
  }

  return [...areas.values()]
    .sort((a, b) => (a.area.orden ?? 0) - (b.area.orden ?? 0))
    .map((group) => {
      const items = group.items.sort((a, b) => (
        (a.requisito?.orden ?? 0) - (b.requisito?.orden ?? 0)
      ));
      const ready = items.filter((item) => item.effectiveReady).length;
      const compliant = items.filter((item) => item.effectiveCompliant).length;
      const notApplicable = items.filter((item) => item.estado === "no_aplica").length;
      const pending = items.length - ready;
      const applicable = items.length - notApplicable;
      return {
        ...group,
        items,
        ready,
        compliant,
        notApplicable,
        pending,
        overdue: items.filter((item) => item.estado === "vencido").length,
        observed: items.filter((item) => item.openObservations > 0 || ["observado", "no_cumple"].includes(item.estado)).length,
        percentage: items.length === 0 ? 0 : applicable > 0 ? Math.round((compliant / applicable) * 100) : 100,
      };
    });
}
