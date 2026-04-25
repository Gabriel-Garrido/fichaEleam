import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResidentById } from "./residentService";
import { getVitalSigns } from "../vitalSigns/vitalSignsService";
import { getObservations } from "../observations/observationsService";
import { isValidUUID } from "../../utils/validators";
import Loading from "../../components/Loading";
import Button from "../../components/Button";

const ESTADO_BADGE = {
  activo:        "bg-green-100 text-green-800",
  hospitalizado: "bg-yellow-100 text-yellow-800",
  egresado:      "bg-gray-100 text-gray-700",
  fallecido:     "bg-red-100 text-red-800",
};

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación", eliminacion: "Eliminación",
  actividad: "Actividad", otro: "Otro",
};

const TIPO_BADGE = {
  caida:                      "bg-red-100 text-red-700",
  incidente:                  "bg-orange-100 text-orange-700",
  visita_medica:              "bg-blue-100 text-blue-700",
  curacion:                   "bg-purple-100 text-purple-700",
  administracion_medicamento: "bg-yellow-100 text-yellow-700",
  observacion_general:        "bg-gray-100 text-gray-700",
};

function ResidentDetails() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [resident, setResident] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState("info");

  useEffect(() => {
    if (!isValidUUID(id)) {
      setError("ID de residente inválido.");
      setLoading(false);
      return;
    }
    getResidentById(id)
      .then(setResident)
      .catch((err) => setError("Error al cargar residente: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading message="Cargando residente..." />;
  if (error)   return <div className="p-8 text-red-600">{error}</div>;
  if (!resident) return <div className="p-8 text-gray-500">Residente no encontrado.</div>;

  const tabs = [
    { id: "info",          label: "Información" },
    { id: "signos",        label: "Signos Vitales" },
    { id: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/residents")}
          className="text-[var(--color-primary)] hover:underline text-sm"
        >
          ← Volver a residentes
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {resident.apellido}, {resident.nombre}
              </h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  ESTADO_BADGE[resident.estado]
                }`}
              >
                {resident.estado}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              {resident.rut && <span>RUT: {resident.rut}</span>}
              {resident.habitacion && (
                <span>Hab. {resident.habitacion} — Cama {resident.cama}</span>
              )}
              {resident.fecha_ingreso && (
                <span>
                  Ingreso:{" "}
                  {new Date(resident.fecha_ingreso).toLocaleDateString("es-CL")}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate(`/residents/${id}/edit`)}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)] text-sm"
            >
              Editar
            </Button>
            <Button
              onClick={() => navigate(`/vital-signs/new?residenteId=${id}`)}
              className="bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              + Signos
            </Button>
            <Button
              onClick={() => navigate(`/observations/new?residenteId=${id}`)}
              className="bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              + Observación
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info"          && <InfoTab resident={resident} />}
      {tab === "signos"        && <SignosTab residenteId={id} navigate={navigate} />}
      {tab === "observaciones" && <ObservacionesTab residenteId={id} navigate={navigate} />}
    </div>
  );
}

/* ─── Info Tab ──────────────────────────────────────────────── */

function InfoTab({ resident }) {
  const InfoRow = ({ label, value }) =>
    value ? (
      <div>
        <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-gray-700 mt-0.5">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Datos Personales</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow
            label="Fecha nacimiento"
            value={
              resident.fecha_nacimiento
                ? new Date(resident.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-CL")
                : null
            }
          />
          <InfoRow label="Sexo"            value={resident.sexo} />
          <InfoRow label="Nacionalidad"    value={resident.nacionalidad} />
          <InfoRow label="Estado civil"    value={resident.estado_civil} />
          <InfoRow label="Previsión"       value={resident.prevision} />
          <InfoRow label="Grupo sanguíneo" value={resident.grupo_sanguineo} />
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Información Clínica</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Diagnóstico principal" value={resident.diagnostico_principal} />
          <InfoRow label="Nivel de dependencia"  value={resident.nivel_dependencia} />
          <InfoRow
            label="Índice de Barthel"
            value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : null}
          />
          <InfoRow label="Escala Katz" value={resident.escala_katz} />
          {resident.alergias?.length > 0 && (
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Alergias</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {resident.alergias.map((a) => (
                  <span key={a} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Contacto de Emergencia</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre"           value={resident.nombre_contacto} />
          <InfoRow label="Parentesco"       value={resident.parentesco_contacto} />
          <InfoRow label="Teléfono"         value={resident.telefono_contacto} />
          <InfoRow label="Dirección anterior" value={resident.direccion_anterior} />
        </dl>
      </section>

      {(resident.estado === "egresado" || resident.estado === "fallecido") &&
        resident.fecha_egreso && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Egreso</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                label="Fecha de egreso"
                value={new Date(resident.fecha_egreso).toLocaleDateString("es-CL")}
              />
              <InfoRow label="Motivo de egreso" value={resident.motivo_egreso} />
            </dl>
          </section>
        )}
    </div>
  );
}

/* ─── Signos Vitales Tab (lazy-loaded) ──────────────────────── */

function SignosTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    getVitalSigns(residenteId, { limit: 5 })
      .then(setRecords)
      .catch(() => setError("No se pudo cargar los signos vitales."))
      .finally(() => setLoading(false));
  }, [residenteId]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    loaded.current = false;
    getVitalSigns(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar los signos vitales."))
      .finally(() => setLoading(false));
  };

  if (loading) return <Loading message="Cargando signos vitales..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">Últimos 5 registros</h3>
        <div className="flex gap-2">
          <button onClick={refresh} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Actualizar
          </button>
          <button
            onClick={() => navigate(`/vital-signs?residenteId=${residenteId}`)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver todos →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm mb-3">No hay registros de signos vitales.</p>
          <button
            onClick={() => navigate(`/vital-signs/new?residenteId=${residenteId}`)}
            className="text-sm bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            Registrar ahora
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-3 text-left">Fecha/Hora</th>
                <th className="px-3 py-3 text-center">P/A</th>
                <th className="px-3 py-3 text-center">FC</th>
                <th className="px-3 py-3 text-center">Temp.</th>
                <th className="px-3 py-3 text-center">SatO₂</th>
                <th className="px-3 py-3 text-center">Dolor</th>
                <th className="px-3 py-3 text-center">Turno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-gray-600">
                    {new Date(r.fecha_hora).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.presion_sistolica && r.presion_diastolica
                      ? `${r.presion_sistolica}/${r.presion_diastolica}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">{r.frecuencia_cardiaca ?? "—"}</td>
                  <td className={`px-3 py-2.5 text-center font-medium ${r.temperatura > 37.5 ? "text-red-600" : "text-gray-700"}`}>
                    {r.temperatura != null ? `${r.temperatura}°` : "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-center font-medium ${r.saturacion_oxigeno != null && r.saturacion_oxigeno < 95 ? "text-red-600" : "text-gray-700"}`}>
                    {r.saturacion_oxigeno != null ? `${r.saturacion_oxigeno}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.dolor_escala != null ? (
                      <span className={`font-medium ${r.dolor_escala >= 7 ? "text-red-600" : r.dolor_escala >= 4 ? "text-yellow-600" : "text-green-600"}`}>
                        {r.dolor_escala}/10
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center capitalize text-gray-400">{r.turno ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Observaciones Tab (lazy-loaded) ───────────────────────── */

function ObservacionesTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    getObservations(residenteId, { limit: 5 })
      .then(setRecords)
      .catch(() => setError("No se pudo cargar las observaciones."))
      .finally(() => setLoading(false));
  }, [residenteId]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    loaded.current = false;
    getObservations(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar las observaciones."))
      .finally(() => setLoading(false));
  };

  if (loading) return <Loading message="Cargando observaciones..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">Últimas 5 observaciones</h3>
        <div className="flex gap-2">
          <button onClick={refresh} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Actualizar
          </button>
          <button
            onClick={() => navigate(`/observations?residenteId=${residenteId}`)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver todas →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm mb-3">No hay observaciones registradas.</p>
          <button
            onClick={() => navigate(`/observations/new?residenteId=${residenteId}`)}
            className="text-sm bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            Nueva observación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-gray-100 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    TIPO_BADGE[r.tipo] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {TIPO_LABEL[r.tipo] ?? r.tipo}
                </span>
                {r.requiere_seguimiento && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    ⚠ Seguimiento
                  </span>
                )}
                <span className="text-xs text-gray-400 capitalize">{r.turno}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(r.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-700">{r.descripcion}</p>
              {r.acciones_tomadas && (
                <p className="text-xs text-gray-400 italic mt-1">
                  Acciones: {r.acciones_tomadas}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResidentDetails;
