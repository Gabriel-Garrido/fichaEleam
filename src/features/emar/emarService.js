import { supabase } from "../../services/supabaseConfig";
import { normalizeFamilyVisibility } from "../familiar/familyVisibility";
import {
  currentTurno, todayIso,
  getSessionProfile, nextFollowUpSlot, normalizeSchedule, previousTurnos, requireFollowUpSlot,
} from "../carePlans/carePlansService";

export { currentTurno, todayIso };

export const EMAR_TURNOS = ["mañana", "tarde", "noche"];

export const MED_ROUTES = [
  ["oral", "Oral"],
  ["topica", "Tópica"],
  ["subcutanea", "Subcutánea"],
  ["enteral", "Enteral"],
  ["inhalatoria", "Inhalatoria"],
  ["oftalmica", "Oftálmica"],
  ["otica", "Ótica"],
  ["nasal", "Nasal"],
  ["otra", "Otra"],
];

export const MED_STATUS_LABEL = {
  pendiente: "Pendiente",
  administrado: "Administrado",
  omitido: "Omitido",
  pendiente_validacion: "Pendiente validación",
  validado: "Validado",
  revertido: "Revertido",
  cancelado: "Cancelado",
};

export const OMISSION_REASONS = [
  ["rechazo", "Rechazo del residente"],
  ["no_disponible", "No disponible"],
  ["contraindicado", "Contraindicado"],
  ["residente_ausente", "Residente ausente"],
  ["otro", "Otro"],
];

const INDICATION_SELECT = `
  id, eleam_id, residente_id, medicamento_nombre, principio_activo, concentracion,
  forma_farmaceutica, dosis, unidad_dosis, via, indicacion, prescriptor_nombre,
  fecha_indicacion, fecha_inicio, fecha_fin, estado,
  es_controlado, tipo_controlado, requiere_doble_validacion, requiere_stock,
  visible_familiar, resumen_familiar, instrucciones,
  creado_por, actualizado_por, creado_en, actualizado_en
`;

const SCHEDULE_SELECT = `
  id, eleam_id, residente_id, indicacion_id, frecuencia,
  dias_semana, dias_mes, fecha_unica, hora, turno,
  tolerancia_min, activo, creado_en, actualizado_en
`;

const STOCK_LOT_SELECT = `
  id, eleam_id, residente_id, indicacion_id, medicamento_nombre, lote,
  fecha_vencimiento, cantidad_actual, unidad, ubicacion,
  es_controlado, tipo_controlado, estado,
  creado_por, actualizado_por, creado_en, actualizado_en
`;

const ADMINISTRATION_SELECT = `
  id, eleam_id, residente_id, indicacion_id, horario_id, lote_id,
  fecha, turno, hora, estado, dosis_administrada, unidad_dosis,
  motivo_omision, notas, requiere_seguimiento, observacion_id,
  administrado_por, administrado_en, validado_por, validado_en,
  creado_en, actualizado_en
`;

const RECONCILIATION_SELECT = `
  id, eleam_id, lote_id, cantidad_sistema, cantidad_fisica,
  diferencia, motivo, estado, creado_por, validado_por,
  creado_en, validado_en
`;

const ADMIN_SELECT = `
  ${ADMINISTRATION_SELECT},
  residentes(id, nombre, apellido, habitacion, cama),
  horario:medicamentos_horarios(id, tolerancia_min),
  indicacion:medicamentos_indicaciones(
    id, medicamento_nombre, principio_activo, concentracion, dosis, unidad_dosis,
    via, instrucciones, es_controlado, tipo_controlado, requiere_stock, requiere_doble_validacion
  ),
  lote:medicamentos_stock_lotes(id, lote, cantidad_actual, unidad, fecha_vencimiento, ubicacion, es_controlado)
`;

export function medicationDueAt(row) {
  if (!row?.fecha || !row?.hora) return null;
  const dueAt = new Date(`${row.fecha}T${row.hora}`);
  if (Number.isNaN(dueAt.valueOf())) return null;

  const tolerance = Number(row.horario?.tolerancia_min ?? 0);
  if (Number.isFinite(tolerance) && tolerance > 0) {
    dueAt.setMinutes(dueAt.getMinutes() + tolerance);
  }

  return dueAt;
}

export function isMedicationOverdue(row, now = new Date()) {
  if (row?._arrastre) return true;
  if (row?.estado !== "pendiente" || row?.fecha !== todayIso()) return false;
  const dueAt = medicationDueAt(row);
  return dueAt instanceof Date && dueAt < now;
}

export async function generateMedicationAdministrations({ fecha = todayIso(), turno = null } = {}) {
  const { data, error } = await supabase.rpc("generar_administraciones_medicamentos", {
    p_fecha: fecha,
    p_turno: turno,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function listMedicationAdministrations({
  fecha = todayIso(),
  turno = null,
  estado = null,
  residenteId = null,
  generate = true,
  limit = 200,
  includeCarryOver = true,
} = {}) {
  if (generate) await generateMedicationAdministrations({ fecha, turno });

  let query = supabase
    .from("medicamentos_administraciones")
    .select(ADMIN_SELECT)
    .eq("fecha", fecha)
    .order("hora", { ascending: true })
    .limit(limit);

  if (turno) query = query.eq("turno", turno);
  if (estado) query = query.eq("estado", estado);
  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data, error } = await query;
  if (error) throw error;
  const currentRows = (data ?? []).map((row) => ({ ...row, _arrastre: false }));

  if (!includeCarryOver || !turno || (estado && !["pendiente", "pendiente_validacion"].includes(estado))) {
    return currentRows;
  }

  const carryStates = estado ? [estado] : ["pendiente", "pendiente_validacion"];
  const carryQueries = [];
  let older = supabase
    .from("medicamentos_administraciones")
    .select(ADMIN_SELECT)
    .in("estado", carryStates)
    .lt("fecha", fecha)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(100);
  if (residenteId) older = older.eq("residente_id", residenteId);
  carryQueries.push(older);

  const previous = previousTurnos(turno);
  if (previous.length > 0) {
    let sameDay = supabase
      .from("medicamentos_administraciones")
      .select(ADMIN_SELECT)
      .in("estado", carryStates)
      .eq("fecha", fecha)
      .in("turno", previous)
      .order("hora", { ascending: true })
      .limit(100);
    if (residenteId) sameDay = sameDay.eq("residente_id", residenteId);
    carryQueries.push(sameDay);
  }

  const carryResults = await Promise.all(carryQueries);
  const carryRows = [];
  for (const result of carryResults) {
    if (result.error) throw result.error;
    carryRows.push(...(result.data ?? []).map((row) => ({ ...row, _arrastre: true })));
  }

  const seen = new Set();
  return [...carryRows, ...currentRows]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`));
}

export async function getResidentEmar(residenteId) {
  const [indicaciones, lotes, administraciones] = await Promise.all([
    supabase
      .from("medicamentos_indicaciones")
      .select(`${INDICATION_SELECT}, horarios:medicamentos_horarios(${SCHEDULE_SELECT})`)
      .eq("residente_id", residenteId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("medicamentos_stock_lotes")
      .select(STOCK_LOT_SELECT)
      .eq("residente_id", residenteId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("medicamentos_administraciones")
      .select(`${ADMINISTRATION_SELECT}, indicacion:medicamentos_indicaciones(medicamento_nombre, dosis, via, es_controlado)`)
      .eq("residente_id", residenteId)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(20),
  ]);

  if (indicaciones.error) throw indicaciones.error;
  if (lotes.error) throw lotes.error;
  if (administraciones.error) throw administraciones.error;

  return {
    indicaciones: indicaciones.data ?? [],
    lotes: lotes.data ?? [],
    administraciones: administraciones.data ?? [],
  };
}

export async function saveMedicationIndication({ residenteId, indication, schedule }) {
  const { userId, eleamId } = await getSessionProfile();
  const payload = {
    eleam_id: eleamId,
    residente_id: residenteId,
    medicamento_nombre: indication.medicamento_nombre?.trim(),
    principio_activo: indication.principio_activo?.trim() || null,
    concentracion: indication.concentracion?.trim() || null,
    forma_farmaceutica: indication.forma_farmaceutica?.trim() || null,
    dosis: indication.dosis?.trim(),
    unidad_dosis: indication.unidad_dosis?.trim() || null,
    via: indication.via || "oral",
    indicacion: indication.indicacion?.trim() || null,
    prescriptor_nombre: indication.prescriptor_nombre?.trim() || null,
    fecha_indicacion: indication.fecha_indicacion || null,
    fecha_inicio: indication.fecha_inicio || todayIso(),
    fecha_fin: indication.fecha_fin || null,
    estado: indication.estado || "activo",
    es_controlado: indication.es_controlado === true,
    tipo_controlado: indication.es_controlado ? indication.tipo_controlado || "psicotropico" : null,
    requiere_doble_validacion: indication.es_controlado === true,
    requiere_stock: indication.requiere_stock !== false,
    ...normalizeFamilyVisibility(indication),
    instrucciones: indication.instrucciones?.trim() || null,
    actualizado_por: userId,
  };

  if (!payload.medicamento_nombre || !payload.dosis) {
    throw new Error("Medicamento y dosis son obligatorios.");
  }

  let saved;
  if (indication.id) {
    const { data, error } = await supabase
      .from("medicamentos_indicaciones")
      .update(payload)
      .eq("id", indication.id)
      .select(INDICATION_SELECT)
      .single();
    if (error) throw error;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("medicamentos_indicaciones")
      .insert({ ...payload, creado_por: userId })
      .select(INDICATION_SELECT)
      .single();
    if (error) throw error;
    saved = data;
  }

  const sourceSchedules = Array.isArray(indication.schedules) && indication.schedules.length
    ? indication.schedules
    : Array.isArray(schedule)
      ? schedule
      : [schedule];
  const horarios = sourceSchedules
    .filter(Boolean)
    .map((item) => ({ ...normalizeSchedule(item), id: item.id || null }));

  if (horarios.length === 0) {
    throw new Error("Debe registrar al menos un horario.");
  }

  if (indication.id) {
    const activeIds = horarios.map((item) => item.id).filter(Boolean);
    let deactivate = supabase
      .from("medicamentos_horarios")
      .update({ activo: false })
      .eq("indicacion_id", saved.id);

    if (activeIds.length > 0) {
      deactivate = deactivate.not("id", "in", `(${activeIds.join(",")})`);
    }

    const { error: deactivateError } = await deactivate;
    if (deactivateError) throw deactivateError;
  }

  const existing = horarios.filter((item) => item.id);
  const created = horarios.filter((item) => !item.id);

  for (const item of existing) {
    const { id, ...horario } = item;
    const { error } = await supabase
      .from("medicamentos_horarios")
      .update({
        ...horario,
        eleam_id: eleamId,
        residente_id: residenteId,
        indicacion_id: saved.id,
        activo: horario.activo !== false,
      })
      .eq("id", id);
    if (error) throw error;
  }

  if (created.length > 0) {
    const { error } = await supabase
      .from("medicamentos_horarios")
      .insert(created.map((item) => {
        const horario = { ...item };
        delete horario.id;
        return {
          ...horario,
          eleam_id: eleamId,
          residente_id: residenteId,
          indicacion_id: saved.id,
        };
      }));
    if (error) throw error;
  }

  return saved;
}

export async function saveStockLot({ residenteId, indication = null, lot }) {
  const { userId, eleamId } = await getSessionProfile();
  const isControlled = indication?.es_controlado === true || lot.es_controlado === true;
  const payload = {
    eleam_id: eleamId,
    residente_id: residenteId,
    indicacion_id: (indication?.id ?? lot.indicacion_id) || null,
    medicamento_nombre: lot.medicamento_nombre?.trim() || indication?.medicamento_nombre,
    lote: lot.lote?.trim() || null,
    fecha_vencimiento: lot.fecha_vencimiento || null,
    cantidad_actual: Number(lot.cantidad_actual ?? 0),
    unidad: lot.unidad?.trim() || indication?.unidad_dosis || "unidad",
    ubicacion: lot.ubicacion?.trim() || null,
    es_controlado: isControlled,
    tipo_controlado: isControlled ? lot.tipo_controlado || indication?.tipo_controlado || "psicotropico" : null,
    estado: lot.estado || "activo",
    actualizado_por: userId,
  };

  if (!payload.medicamento_nombre) throw new Error("El medicamento es obligatorio.");

  if (lot.id) {
    const metadataPayload = { ...payload };
    delete metadataPayload.cantidad_actual;
    const { data, error } = await supabase
      .from("medicamentos_stock_lotes")
      .update(metadataPayload)
      .eq("id", lot.id)
      .select(STOCK_LOT_SELECT)
      .single();
    if (error) throw error;
    return data;
  }

  const initialQuantity = payload.cantidad_actual;
  const { data, error } = await supabase
    .from("medicamentos_stock_lotes")
    .insert({ ...payload, cantidad_actual: 0, creado_por: userId })
    .select(STOCK_LOT_SELECT)
    .single();
  if (error) throw error;

  if (initialQuantity > 0) {
    const { data: moved, error: movementError } = await supabase.rpc("registrar_movimiento_stock_medicamento", {
      p_lote_id: data.id,
      p_tipo: "recepcion",
      p_cantidad: initialQuantity,
      p_motivo: "Stock inicial",
    });
    if (movementError) throw movementError;
    return moved ?? { ...data, cantidad_actual: initialQuantity };
  }

  return data;
}

export async function listAvailableLots({ residenteId, indicacionId = null, controlado = null } = {}) {
  let query = supabase
    .from("medicamentos_stock_lotes")
    .select(STOCK_LOT_SELECT)
    .eq("estado", "activo")
    .gt("cantidad_actual", 0)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false });

  if (residenteId) query = query.eq("residente_id", residenteId);
  if (indicacionId) query = query.or(`indicacion_id.eq.${indicacionId},indicacion_id.is.null`);
  if (controlado === true) query = query.eq("es_controlado", true);
  if (controlado === false) query = query.eq("es_controlado", false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function administerMedication({
  id,
  estado,
  loteId,
  dosis,
  notas,
  motivoOmision,
  requiereSeguimiento,
  seguimientoFecha,
  seguimientoTurno,
}) {
  const fallbackFollowUp = requiereSeguimiento && (!seguimientoFecha || !seguimientoTurno)
    ? nextFollowUpSlot(todayIso(), currentTurno())
    : null;
  const finalSeguimientoFecha = seguimientoFecha || fallbackFollowUp?.fecha || null;
  const finalSeguimientoTurno = seguimientoTurno || fallbackFollowUp?.turno || null;
  requireFollowUpSlot({
    requiereSeguimiento,
    seguimientoFecha: finalSeguimientoFecha,
    seguimientoTurno: finalSeguimientoTurno,
  });
  const { data, error } = await supabase.rpc("registrar_administracion_medicamento", {
    p_administracion_id: id,
    p_estado: estado,
    p_lote_id: loteId || null,
    p_dosis_administrada: dosis !== "" && dosis != null ? Number(dosis) : null,
    p_notas: notas || null,
    p_motivo_omision: motivoOmision || null,
    p_requiere_seguimiento: requiereSeguimiento === true,
    p_seguimiento_fecha: requiereSeguimiento ? finalSeguimientoFecha : null,
    p_seguimiento_turno: requiereSeguimiento ? finalSeguimientoTurno : null,
  });
  if (error) throw error;
  return data;
}

export async function validateControlledAdministration({ id, notas }) {
  const { data, error } = await supabase.rpc("validar_administracion_controlada", {
    p_administracion_id: id,
    p_notas: notas || null,
  });
  if (error) throw error;
  return data;
}

export async function registerStockMovement({ loteId, tipo, cantidad, motivo }) {
  const { data, error } = await supabase.rpc("registrar_movimiento_stock_medicamento", {
    p_lote_id: loteId,
    p_tipo: tipo,
    p_cantidad: Number(cantidad),
    p_motivo: motivo || null,
  });
  if (error) throw error;
  return data;
}

export async function reconcileControlledStock({ loteId, cantidadFisica, motivo, conciliacionId = null }) {
  const { data, error } = await supabase.rpc("conciliar_stock_controlado", {
    p_lote_id: loteId || null,
    p_cantidad_fisica: cantidadFisica !== "" && cantidadFisica != null ? Number(cantidadFisica) : null,
    p_motivo: motivo || null,
    p_conciliacion_id: conciliacionId || null,
  });
  if (error) throw error;
  return data;
}

export async function listPendingControlledReconciliations() {
  const { data, error } = await supabase
    .from("medicamentos_conciliaciones")
    .select(`${RECONCILIATION_SELECT}, lote:medicamentos_stock_lotes(medicamento_nombre, lote, unidad, residente_id)`)
    .eq("estado", "pendiente_validacion")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEmarSummary({ fecha = todayIso(), turno = null } = {}) {
  const rows = await listMedicationAdministrations({ fecha, turno, generate: true, limit: 500 });
  return rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.estado] = (acc[row.estado] ?? 0) + 1;
    if (row.indicacion?.es_controlado) acc.controlados += 1;
    if (isMedicationOverdue(row)) acc.vencidas += 1;
    return acc;
  }, {
    total: 0,
    pendiente: 0,
    administrado: 0,
    omitido: 0,
    pendiente_validacion: 0,
    validado: 0,
    controlados: 0,
    vencidas: 0,
  });
}
