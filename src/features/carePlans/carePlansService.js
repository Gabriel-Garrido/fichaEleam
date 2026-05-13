import { supabase } from "../../services/supabaseConfig";

export const CARE_TURNOS = ["mañana", "tarde", "noche"];

export const CARE_CATEGORIES = [
  ["alimentacion", "Alimentación"],
  ["hidratacion", "Hidratación"],
  ["higiene", "Higiene"],
  ["bano", "Baño"],
  ["movilidad", "Movilidad"],
  ["cambios_posicion", "Cambios de posición"],
  ["eliminacion", "Eliminación"],
  ["prevencion_caidas", "Prevención de caídas"],
  ["prevencion_up", "Prevención UPP"],
  ["actividad", "Actividad"],
  ["controles", "Controles"],
  ["otro", "Otro"],
];

export const CARE_CATEGORY_LABEL = Object.fromEntries(CARE_CATEGORIES);

export const CARE_STATUS_LABEL = {
  pendiente: "Pendiente",
  cumplida: "Cumplida",
  omitida: "Omitida",
  reprogramada: "Reprogramada",
  cancelada: "Cancelada",
};

export const OMISSION_REASONS = [
  ["rechazo", "Rechazo del residente"],
  ["no_disponible", "Recurso no disponible"],
  ["contraindicado", "Contraindicado"],
  ["residente_ausente", "Residente ausente"],
  ["otro", "Otro"],
];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentTurno(date = new Date()) {
  const h = date.getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

const TASK_SELECT = `
  *,
  residentes(id, nombre, apellido, habitacion, cama, nivel_dependencia),
  actividad:plan_cuidado_actividades(id, titulo, categoria, prioridad, instrucciones, requiere_observacion)
`;

function previousTurnos(turno) {
  const index = CARE_TURNOS.indexOf(turno);
  return index > 0 ? CARE_TURNOS.slice(0, index) : [];
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

export async function getResidentCarePlan(residenteId) {
  const { data, error } = await supabase
    .from("planes_cuidado")
    .select(`
      *,
      actividades:plan_cuidado_actividades(
        *,
        horarios:plan_cuidado_horarios(*)
      )
    `)
    .eq("residente_id", residenteId)
    .eq("estado", "activo")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCarePlan(residenteId, payload = {}) {
  const { userId, eleamId } = await getSessionProfile();
  const base = {
    titulo: payload.titulo?.trim() || "Plan de cuidado",
    objetivos: payload.objetivos?.trim() || null,
    pauta_alimentacion: payload.pauta_alimentacion?.trim() || null,
    pauta_hidratacion: payload.pauta_hidratacion?.trim() || null,
    restricciones: payload.restricciones?.trim() || null,
    riesgo_caidas: payload.riesgo_caidas || null,
    riesgo_up: payload.riesgo_up || null,
    actualizado_por: userId,
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from("planes_cuidado")
      .update(base)
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("planes_cuidado")
    .insert({
      ...base,
      eleam_id: eleamId,
      residente_id: residenteId,
      creado_por: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveCareActivity({ plan, activity, schedule }) {
  const { userId } = await getSessionProfile();
  const payload = {
    eleam_id: plan.eleam_id,
    residente_id: plan.residente_id,
    plan_id: plan.id,
    categoria: activity.categoria,
    titulo: activity.titulo?.trim(),
    descripcion: activity.descripcion?.trim() || null,
    instrucciones: activity.instrucciones?.trim() || null,
    prioridad: activity.prioridad || "media",
    requiere_observacion: activity.requiere_observacion === true,
    activo: activity.activo !== false,
    actualizado_por: userId,
  };

  if (!payload.titulo) throw new Error("El título de la actividad es obligatorio.");

  let saved;
  if (activity.id) {
    const { data, error } = await supabase
      .from("plan_cuidado_actividades")
      .update(payload)
      .eq("id", activity.id)
      .select()
      .single();
    if (error) throw error;
    saved = data;

    const { error: deleteError } = await supabase
      .from("plan_cuidado_horarios")
      .delete()
      .eq("actividad_id", saved.id);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("plan_cuidado_actividades")
      .insert({ ...payload, creado_por: userId })
      .select()
      .single();
    if (error) throw error;
    saved = data;
  }

  const horario = normalizeSchedule(schedule);
  const { error: scheduleError } = await supabase
    .from("plan_cuidado_horarios")
    .insert({
      ...horario,
      eleam_id: plan.eleam_id,
      residente_id: plan.residente_id,
      actividad_id: saved.id,
    });
  if (scheduleError) throw scheduleError;

  return saved;
}

export async function deactivateCareActivity(activityId) {
  const { error } = await supabase
    .from("plan_cuidado_actividades")
    .update({ activo: false })
    .eq("id", activityId);
  if (error) throw error;

  const { error: scheduleError } = await supabase
    .from("plan_cuidado_horarios")
    .update({ activo: false })
    .eq("actividad_id", activityId);
  if (scheduleError) throw scheduleError;
}

export async function generateCareTasks({ fecha = todayIso(), turno = null } = {}) {
  const { data, error } = await supabase.rpc("generar_tareas_cuidado", {
    p_fecha: fecha,
    p_turno: turno,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function listCareTasks({
  fecha = todayIso(),
  turno = null,
  estado = null,
  residenteId = null,
  generate = true,
  limit = 200,
  includeCarryOver = true,
} = {}) {
  if (generate) await generateCareTasks({ fecha, turno });

  let query = supabase
    .from("tareas_cuidado")
    .select(TASK_SELECT)
    .eq("fecha", fecha)
    .order("hora", { ascending: true })
    .limit(limit);

  if (turno) query = query.eq("turno", turno);
  if (estado) query = query.eq("estado", estado);
  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data, error } = await query;
  if (error) throw error;
  const currentRows = (data ?? []).map((row) => ({ ...row, _arrastre: false }));

  if (!includeCarryOver || !turno || (estado && estado !== "pendiente")) {
    return currentRows;
  }

  const carryQueries = [];
  let older = supabase
    .from("tareas_cuidado")
    .select(TASK_SELECT)
    .eq("estado", "pendiente")
    .lt("fecha", fecha)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(100);
  if (residenteId) older = older.eq("residente_id", residenteId);
  carryQueries.push(older);

  const previous = previousTurnos(turno);
  if (previous.length > 0) {
    let sameDay = supabase
      .from("tareas_cuidado")
      .select(TASK_SELECT)
      .eq("estado", "pendiente")
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

export async function completeCareTask({ id, estado, notas, motivoOmision, requiereSeguimiento }) {
  const { data, error } = await supabase.rpc("completar_tarea_cuidado", {
    p_tarea_id: id,
    p_estado: estado,
    p_notas: notas || null,
    p_motivo_omision: motivoOmision || null,
    p_requiere_seguimiento: requiereSeguimiento === true,
  });
  if (error) throw error;
  return data;
}

export async function getCareTaskSummary({ fecha = todayIso(), turno = null } = {}) {
  const tasks = await listCareTasks({ fecha, turno, generate: true, limit: 500 });
  return tasks.reduce((acc, task) => {
    acc.total += 1;
    acc[task.estado] = (acc[task.estado] ?? 0) + 1;
    if (task._arrastre) {
      acc.vencidas += 1;
    } else if (task.estado === "pendiente" && task.hora && task.fecha === todayIso()) {
      const due = new Date(`${task.fecha}T${task.hora}`);
      if (!Number.isNaN(due.valueOf()) && due < new Date()) acc.vencidas += 1;
    }
    return acc;
  }, { total: 0, pendiente: 0, cumplida: 0, omitida: 0, reprogramada: 0, cancelada: 0, vencidas: 0 });
}
