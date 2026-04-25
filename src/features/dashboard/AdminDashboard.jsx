import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loadDashboard } from "./dashboardService";

function StatCard({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-[var(--color-secondary)] transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-600 text-center leading-tight">{label}</span>
    </button>
  );
}

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación", eliminacion: "Eliminación",
  actividad: "Actividad", otro: "Otro",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, eleam } = useAuth();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats    = data?.residentStats ?? null;
  const errors   = data?.errors ?? {};

  const acreditacion = (() => {
    const prog = data?.acreditacionProgress ?? [];
    if (!prog.length) return { porcentaje: 0, completas: 0, total: 0 };
    const completas  = prog.filter((c) => c.porcentaje === 100).length;
    const conDocumentos = prog.filter((c) => c.subidos > 0).length;
    const porcentaje = Math.round((conDocumentos / prog.length) * 100);
    return { porcentaje, completas, total: prog.length };
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-0.5">
          {profile?.nombre ? `Bienvenido, ${profile.nombre}` : "Bienvenido"}
        </h1>
        {eleam?.nombre && (
          <p className="text-teal-100 text-sm font-medium">{eleam.nombre}</p>
        )}
        <div className="flex gap-6 mt-3 text-sm text-teal-100">
          <span>Hoy: <strong className="text-white">{loading ? "…" : data?.signosHoy ?? 0}</strong> signos vitales</span>
          <span><strong className="text-white">{loading ? "…" : data?.observacionesHoy ?? 0}</strong> observaciones</span>
        </div>
      </div>

      {/* Resident stats */}
      {errors.residentStats ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          No se pudieron cargar las estadísticas de residentes.
        </div>
      ) : (
        <>
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-3">Residentes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total" value={loading ? "…" : stats?.total ?? 0} color="text-gray-800" onClick={() => navigate("/residents")} />
            <StatCard label="Activos" value={loading ? "…" : stats?.activos ?? 0} color="text-green-600" onClick={() => navigate("/residents")} />
            <StatCard label="Hospitalizados" value={loading ? "…" : stats?.hospitalizados ?? 0} color="text-yellow-600" onClick={() => navigate("/residents")} />
            <StatCard label="Egresados" value={loading ? "…" : stats?.egresados ?? 0} color="text-gray-500" onClick={() => navigate("/residents")} />
          </div>
        </>
      )}

      {/* Pending follow-ups */}
      {!errors.followUps && (data?.pendingFollowUps?.length ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500 text-lg">⚠</span>
            <h2 className="font-semibold text-orange-800">
              Seguimientos pendientes ({data.pendingFollowUps.length})
            </h2>
          </div>
          <div className="space-y-2">
            {data.pendingFollowUps.slice(0, 5).map((obs) => (
              <div
                key={obs.id}
                onClick={() => navigate(`/residents/${obs.residente_id}`)}
                className="bg-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-orange-50 transition-colors flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800 text-sm">
                    {obs.residentes
                      ? `${obs.residentes.apellido}, ${obs.residentes.nombre}`
                      : "—"}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {TIPO_LABEL[obs.tipo] ?? obs.tipo}
                  </span>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{obs.descripcion}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(obs.fecha_hora).toLocaleDateString("es-CL")}
                </span>
              </div>
            ))}
          </div>
          {data.pendingFollowUps.length > 5 && (
            <button
              onClick={() => navigate("/observations")}
              className="mt-2 text-xs text-orange-700 hover:underline"
            >
              Ver todos ({data.pendingFollowUps.length}) →
            </button>
          )}
        </div>
      )}

      {/* Expiring documents */}
      {!errors.expiring && (data?.expiringDocuments?.length ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 text-lg">📅</span>
            <h2 className="font-semibold text-amber-800">
              Documentos por vencer ({data.expiringDocuments.length})
            </h2>
          </div>
          <div className="space-y-2">
            {data.expiringDocuments.slice(0, 4).map((doc) => {
              const daysLeft = Math.ceil(
                (new Date(doc.fecha_vencimiento) - new Date()) / 86400000
              );
              return (
                <div
                  key={doc.id}
                  onClick={() => navigate("/accreditation")}
                  className="bg-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors flex justify-between items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 text-sm truncate block">{doc.nombre}</span>
                    <span className="text-xs text-gray-400">
                      {doc.categorias_acreditacion?.nombre ?? "—"}
                    </span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${daysLeft <= 7 ? "text-red-600" : "text-amber-700"}`}>
                    {daysLeft <= 0 ? "Hoy" : `${daysLeft}d`}
                  </span>
                </div>
              );
            })}
          </div>
          {data.expiringDocuments.length > 4 && (
            <button
              onClick={() => navigate("/accreditation")}
              className="mt-2 text-xs text-amber-700 hover:underline"
            >
              Ver todos →
            </button>
          )}
        </div>
      )}

      {/* Accreditation progress */}
      <div
        onClick={() => navigate("/accreditation")}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Documentación SEREMI</span>
          <span className="text-xl font-bold text-[var(--color-primary)]">
            {loading ? "…" : `${acreditacion.porcentaje}%`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${acreditacion.porcentaje}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {acreditacion.completas} de {acreditacion.total} categorías completadas
        </p>
      </div>

      {/* Quick actions */}
      <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon="👴" label="Agregar Residente"        onClick={() => navigate("/residents/new")} />
        <QuickAction icon="📊" label="Registrar Signos Vitales" onClick={() => navigate("/vital-signs/new")} />
        <QuickAction icon="📋" label="Nueva Observación"        onClick={() => navigate("/observations/new")} />
        <QuickAction icon="📁" label="Subir Documento SEREMI"   onClick={() => navigate("/accreditation/upload")} />
        <QuickAction icon="👥" label="Ver Residentes"           onClick={() => navigate("/residents")} />
        <QuickAction icon="💓" label="Historial Signos"         onClick={() => navigate("/vital-signs")} />
        <QuickAction icon="📝" label="Ver Observaciones"        onClick={() => navigate("/observations")} />
        <QuickAction icon="🏥" label="Panel Acreditación"       onClick={() => navigate("/accreditation")} />
      </div>
    </div>
  );
}
