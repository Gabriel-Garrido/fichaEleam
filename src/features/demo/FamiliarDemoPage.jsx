import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_RESIDENTS, MOCK_VITAL_SIGNS, MOCK_OBSERVATIONS } from "./mockData";
import { VITAL_DEFS, recordOverallStatus, STATUS } from "../vitalSigns/vitalRanges";

// Para el demo familiar tomamos un residente fijo (el primero) y filtramos
// sus registros. Las visitas viven solo en estado local del componente.

const RESIDENTE = MOCK_RESIDENTS[0];
const PARENTESCO = "Hija";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function calcAge(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function FamiliarBanner() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm shadow-md">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">DEMO</span>
        <span>
          Estás explorando el demo como <strong>Familiar de un residente</strong>.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/demo")}
          className="text-white/80 hover:text-white underline text-xs transition-colors"
        >
          Cambiar perfil
        </button>
        <button
          onClick={() => navigate("/pago")}
          className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
        >
          Activar versión real →
        </button>
      </div>
    </div>
  );
}

function Header() {
  const age = calcAge(RESIDENTE.fecha_nacimiento);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-black text-lg">
          {(RESIDENTE.nombre[0] ?? "") + (RESIDENTE.apellido[0] ?? "")}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-gray-800 text-xl truncate">
            {RESIDENTE.nombre} {RESIDENTE.apellido}
          </h2>
          <p className="text-sm text-gray-500">
            {age != null && <>{age} años · </>}
            Tu vínculo: <span className="font-semibold">{PARENTESCO}</span>
          </p>
          {(RESIDENTE.habitacion || RESIDENTE.cama) && (
            <p className="text-xs text-gray-400 mt-0.5">
              Habitación {RESIDENTE.habitacion ?? "—"} · Cama {RESIDENTE.cama ?? "—"}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
          {RESIDENTE.estado}
        </span>
      </div>
    </div>
  );
}

function VitalsBlock() {
  const myVitals = MOCK_VITAL_SIGNS
    .filter((v) => v.residente_id === RESIDENTE.id)
    .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
  const latest = myVitals[0];
  if (!latest) {
    return <p className="text-sm text-gray-500">Aún no hay signos vitales registrados.</p>;
  }
  const overall = recordOverallStatus(latest);
  const overallStyle = STATUS[overall] ?? STATUS.unknown;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Último registro · {formatDateTime(latest.fecha_hora)}
        </p>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${overallStyle.badge}`}>
          {overallStyle.label}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(VITAL_DEFS).map(([key, def]) => {
          const status = def.statusFor(latest);
          const s = STATUS[status] ?? STATUS.unknown;
          const value = key === "presion"
            ? def.format(latest.presion_sistolica, latest.presion_diastolica)
            : def.format(
                latest[
                  key === "fc"      ? "frecuencia_cardiaca" :
                  key === "fr"      ? "frecuencia_respiratoria" :
                  key === "temp"    ? "temperatura" :
                  key === "spo2"    ? "saturacion_oxigeno" :
                  key === "glucosa" ? "glucosa" :
                  key === "dolor"   ? "dolor_escala" : key
                ]
              );
          return (
            <div key={key} className={`rounded-xl border p-3 bg-white ${s.ring} ring-1`}>
              <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide truncate">
                {def.icon} {def.label}
              </p>
              <p className={`text-lg font-black truncate ${s.text}`}>
                {value} <span className="text-xs font-semibold text-gray-400">{def.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

const TIPO_LABEL = {
  observacion_general: "Observación general",
  caida: "Caída",
  incidente: "Incidente",
  curacion: "Curación",
  visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento",
  cambio_posicion: "Cambio de posición",
  higiene: "Higiene",
  alimentacion: "Alimentación",
  eliminacion: "Eliminación",
  actividad: "Actividad",
  otro: "Otro",
};

function ObservationsBlock() {
  const myObs = MOCK_OBSERVATIONS
    .filter((o) => o.residente_id === RESIDENTE.id)
    .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
  if (myObs.length === 0) {
    return <p className="text-sm text-gray-500">Sin observaciones recientes.</p>;
  }
  return (
    <ul className="divide-y">
      {myObs.map((o) => (
        <li key={o.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-700 line-clamp-3">{o.descripcion}</p>
              {o.acciones_tomadas && (
                <p className="text-xs text-gray-500 mt-1">Acciones: {o.acciones_tomadas}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">
                {TIPO_LABEL[o.tipo] ?? o.tipo}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(o.fecha_hora)}</p>
              {o.requiere_seguimiento && (
                <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Seguimiento
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FamiliarDemoPage() {
  const navigate = useNavigate();
  const [visitas, setVisitas] = useState([]);
  const [logging, setLogging] = useState(false);

  const handleLogVisit = () => {
    setLogging(true);
    const nueva = {
      id: `v-${Date.now()}`,
      fecha_hora: new Date().toISOString(),
      duracion_min: null,
      notas: null,
    };
    setVisitas((vs) => [nueva, ...vs]);
    setTimeout(() => setLogging(false), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FamiliarBanner />

      <div className="bg-white border-b border-gray-200 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto h-12 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Portal del familiar</span>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black text-gray-800">Hola Claudia 👋</h1>
          <p className="text-sm text-gray-500">
            Aquí ves el estado y los últimos registros de {RESIDENTE.nombre} en
            la residencia <span className="font-semibold">ELEAM Demo</span>.
          </p>
        </header>

        <Header />

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3">Signos vitales</h2>
          <VitalsBlock />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3">Últimas observaciones</h2>
          <ObservationsBlock />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-gray-800">Mis visitas</h2>
            <button
              onClick={handleLogVisit}
              disabled={logging}
              className="bg-[var(--color-primary)] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)] disabled:opacity-50"
            >
              {logging ? "Guardando..." : "Registrar visita ahora"}
            </button>
          </div>
          {visitas.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aún no registras visitas. Cuando vayas a ver a tu familiar puedes
              dejar constancia con un toque.
            </p>
          ) : (
            <ul className="divide-y">
              {visitas.map((v) => (
                <li key={v.id} className="py-2 text-sm">
                  <span className="font-semibold text-gray-700">{formatDateTime(v.fecha_hora)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 text-sm text-teal-800">
          ¿Te interesa que tu ELEAM use FichaEleam? Comparte
          <a href="https://fichaeleam.cl" className="underline font-semibold ml-1">fichaeleam.cl</a>
          {" "}con la administración del establecimiento. La cuenta del familiar
          es gratuita: la activa el administrador del ELEAM.
        </div>
      </div>
    </div>
  );
}
