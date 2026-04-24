import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResidentById } from "./residentService";
import { isValidUUID } from "../../utils/validators";
import Loading from "../../components/Loading";
import Button from "../../components/Button";

const ESTADO_BADGE = {
  activo: "bg-green-100 text-green-800",
  hospitalizado: "bg-yellow-100 text-yellow-800",
  egresado: "bg-gray-100 text-gray-700",
  fallecido: "bg-red-100 text-red-800",
};

function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("info");

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
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!resident) return <div className="p-8 text-gray-500">Residente no encontrado.</div>;

  const tabs = [
    { id: "info", label: "Información" },
    { id: "signos", label: "Signos Vitales" },
    { id: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/residents")} className="text-[var(--color-primary)] hover:underline text-sm">
          ← Volver a residentes
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {resident.apellido}, {resident.nombre}
              </h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BADGE[resident.estado]}`}>
                {resident.estado}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              {resident.rut && <span>RUT: {resident.rut}</span>}
              {resident.habitacion && <span>Hab. {resident.habitacion} — Cama {resident.cama}</span>}
              {resident.fecha_ingreso && (
                <span>Ingreso: {new Date(resident.fecha_ingreso).toLocaleDateString("es-CL")}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
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
              + Signos Vitales
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

      {tab === "info" && <InfoTab resident={resident} />}
      {tab === "signos" && (
        <div className="text-center py-8 text-gray-500">
          <p>Ver sección <strong>Signos Vitales</strong> en el menú principal para registros de este residente.</p>
          <Button
            onClick={() => navigate(`/vital-signs?residenteId=${id}`)}
            className="mt-4 bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg text-sm"
          >
            Ir a Signos Vitales
          </Button>
        </div>
      )}
      {tab === "observaciones" && (
        <div className="text-center py-8 text-gray-500">
          <p>Ver sección <strong>Observaciones</strong> en el menú principal para registros de este residente.</p>
          <Button
            onClick={() => navigate(`/observations?residenteId=${id}`)}
            className="mt-4 bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg text-sm"
          >
            Ir a Observaciones
          </Button>
        </div>
      )}
    </div>
  );
}

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Datos Personales</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Fecha nacimiento"
            value={resident.fecha_nacimiento ? new Date(resident.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-CL") : null} />
          <InfoRow label="Sexo" value={resident.sexo} />
          <InfoRow label="Nacionalidad" value={resident.nacionalidad} />
          <InfoRow label="Estado civil" value={resident.estado_civil} />
          <InfoRow label="Previsión" value={resident.prevision} />
          <InfoRow label="Grupo sanguíneo" value={resident.grupo_sanguineo} />
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Información Clínica</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Diagnóstico principal" value={resident.diagnostico_principal} />
          <InfoRow label="Nivel de dependencia" value={resident.nivel_dependencia} />
          <InfoRow label="Índice de Barthel" value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : null} />
          <InfoRow label="Escala Katz" value={resident.escala_katz} />
          {resident.alergias?.length > 0 && (
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Alergias</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {resident.alergias.map((a) => (
                  <span key={a} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Contacto de Emergencia</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre" value={resident.nombre_contacto} />
          <InfoRow label="Parentesco" value={resident.parentesco_contacto} />
          <InfoRow label="Teléfono" value={resident.telefono_contacto} />
          <InfoRow label="Dirección anterior" value={resident.direccion_anterior} />
        </dl>
      </div>
    </div>
  );
}

export default ResidentDetails;
