import { supabase } from "../../services/supabaseConfig";
import { currentTurno, todayIso } from "../carePlans/carePlansService";

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

const ADMIN_SELECT = `
  *,
  residentes(id, nombre, apellido, habitacion, cama),
  indicacion:medicamentos_indicaciones(
    id, medicamento_nombre, principio_activo, concentracion, dosis, unidad_dosis,
    via, es_controlado, tipo_controlado, requiere_stock, requiere_doble_validacion
  ),
  lote:medicamentos_stock_lotes(id, lote, cantidad_actual, unidad, fecha_vencimiento, es_controlado)
`;

function previousTurnos(turno) {
  const index = EMAR_TURNOS.indexOf(turno);
  return index > 0 ? EMAR_TURNOS.slice(0, index) : [];
}

async function getSessionProfile() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Debes iniciar sesión.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, eleam_id, rol")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.eleam_id) throw new Error("Tu cuenta no tiene ELEAM asociado.");
  return { userId, eleamId: data.eleam_id, rol: data.rol };
}

function normalizeSchedule(schedule = {}) {
  const frecuencia = schedule.frecuencia || "diaria";
  return {
    frecuencia,
    dias_semana: frecuencia === "semanal" ? schedule.dias_semana ?? [] : null,
    dias_mes: frecuencia === "mensual" ? schedule.dias_mes ?? [] : null,
    fecha_unica: frecuencia === "una_vez" ? schedule.fecha_unica || todayIso() : null,
    hora: schedule.hora || "09:00",
    turno: schedule.turno || currentTurno(),
    tolerancia_min: Number(schedule.tolerancia_min ?? 60),
    activo: schedule.activo !== false,
  };
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
      .select("*, horarios:medicamentos_horarios(*)")
      .eq("residente_id", residenteId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("medicamentos_stock_lotes")
      .select("*")
      .eq("residente_id", residenteId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("medicamentos_administraciones")
      .select("*, indicacion:medicamentos_indicaciones(medicamento_nombre, dosis, via, es_controlado)")
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
      .select()
      .single();
    if (error) throw error;
    saved = data;

    const { error: deleteError } = await supabase
      .from("medicamentos_horarios")
      .delete()
      .eq("indicacion_id", saved.id);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("medicamentos_indicaciones")
      .insert({ ...payload, creado_por: userId })
      .select()
      .single();
    if (error) throw error;
    saved = data;
  }

  const horario = normalizeSchedule(schedule);
  const { error: scheduleError } = await supabase
    .from("medicamentos_horarios")
    .insert({
      ...horario,
      eleam_id: eleamId,
      residente_id: residenteId,
      indicacion_id: saved.id,
    });
  if (scheduleError) throw scheduleError;

  return saved;
}

export async function saveStockLot({ residenteId, indication = null, lot }) {
  const { userId, eleamId } = await getSessionProfile();
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
    es_controlado: lot.es_controlado ?? indication?.es_controlado ?? false,
    tipo_controlado: (lot.es_controlado ?? indication?.es_controlado) ? lot.tipo_controlado || indication?.tipo_controlado || "psicotropico" : null,
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
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const initialQuantity = payload.cantidad_actual;
  const { data, error } = await supabase
    .from("medicamentos_stock_lotes")
    .insert({ ...payload, cantidad_actual: 0, creado_por: userId })
    .select()
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

export async function listAvailableLots({ residenteId, indicacionId = null } = {}) {
  let query = supabase
    .from("medicamentos_stock_lotes")
    .select("*")
    .eq("estado", "activo")
    .gt("cantidad_actual", 0)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false });

  if (residenteId) query = query.eq("residente_id", residenteId);
  if (indicacionId) query = query.or(`indicacion_id.eq.${indicacionId},indicacion_id.is.null`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function administerMedication({ id, estado, loteId, dosis, notas, motivoOmision, requiereSeguimiento }) {
  const { data, error } = await supabase.rpc("registrar_administracion_medicamento", {
    p_administracion_id: id,
    p_estado: estado,
    p_lote_id: loteId || null,
    p_dosis_administrada: dosis !== "" && dosis != null ? Number(dosis) : null,
    p_notas: notas || null,
    p_motivo_omision: motivoOmision || null,
    p_requiere_seguimiento: requiereSeguimiento === true,
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
    .select("*, lote:medicamentos_stock_lotes(medicamento_nombre, lote, unidad, residente_id)")
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
    if (row._arrastre) {
      acc.vencidas += 1;
    } else if (row.estado === "pendiente" && row.fecha === todayIso() && row.hora) {
      const due = new Date(`${row.fecha}T${row.hora}`);
      if (!Number.isNaN(due.valueOf()) && due < new Date()) acc.vencidas += 1;
    }
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
