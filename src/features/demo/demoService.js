import { MOCK_RESIDENTS, MOCK_VITAL_SIGNS, MOCK_OBSERVATIONS } from "./mockData";

const KEY = "fichaeleam_demo_v1";

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function setStore(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// ── Residentes ──────────────────────────────────────────

export function getDemoResidents() {
  const { residents = [] } = getStore();
  return [...MOCK_RESIDENTS, ...residents];
}

export function addDemoResident(resident) {
  const store = getStore();
  const newResident = {
    ...resident,
    id: `user-${Date.now()}`,
    fecha_ingreso: resident.fecha_ingreso || new Date().toISOString().split("T")[0],
  };
  store.residents = [...(store.residents || []), newResident];
  setStore(store);
  return newResident;
}

// ── Signos Vitales ───────────────────────────────────────

export function getDemoVitalSigns() {
  const { vitalSigns = [] } = getStore();
  const residents = getDemoResidents();
  const residentMap = Object.fromEntries(residents.map((r) => [r.id, `${r.nombre} ${r.apellido}`]));
  const enriched = vitalSigns.map((v) => ({
    ...v,
    residente_nombre: residentMap[v.residente_id] || "—",
  }));
  return [...MOCK_VITAL_SIGNS, ...enriched].sort(
    (a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)
  );
}

export function addDemoVitalSign(entry) {
  const store = getStore();
  const residents = getDemoResidents();
  const resident = residents.find((r) => r.id === entry.residente_id);
  const newEntry = {
    ...entry,
    id: `vs-user-${Date.now()}`,
    fecha_hora: entry.fecha_hora || new Date().toISOString(),
    residente_nombre: resident ? `${resident.nombre} ${resident.apellido}` : "—",
  };
  store.vitalSigns = [...(store.vitalSigns || []), newEntry];
  setStore(store);
  return newEntry;
}

// ── Observaciones ────────────────────────────────────────

export function getDemoObservations() {
  const { observations = [] } = getStore();
  return [...MOCK_OBSERVATIONS, ...observations].sort(
    (a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)
  );
}

export function addDemoObservation(obs) {
  const store = getStore();
  const residents = getDemoResidents();
  const resident = residents.find((r) => r.id === obs.residente_id);
  const newObs = {
    ...obs,
    id: `obs-user-${Date.now()}`,
    fecha_hora: new Date().toISOString(),
    residente_nombre: resident ? `${resident.nombre} ${resident.apellido}` : "—",
  };
  store.observations = [...(store.observations || []), newObs];
  setStore(store);
  return newObs;
}

// ── Utilidades ───────────────────────────────────────────

export function clearDemoData() {
  localStorage.removeItem(KEY);
}

export function hasDemoData() {
  const store = getStore();
  return (
    (store.residents?.length || 0) +
    (store.vitalSigns?.length || 0) +
    (store.observations?.length || 0)
  ) > 0;
}
