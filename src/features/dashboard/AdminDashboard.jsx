import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getResidentStats } from "../residents/residentService";
import { getAccreditationProgress } from "../accreditation/accreditationService";

function StatCard({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
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
      <span className="text-xs text-gray-600 text-center">{label}</span>
    </button>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [stats, setStats] = useState({ total: 0, activos: 0, hospitalizados: 0, egresados: 0 });
  const [acreditacion, setAcreditacion] = useState({ porcentaje: 0, completas: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getResidentStats(), getAccreditationProgress()])
      .then(([resStats, accProgress]) => {
        setStats(resStats);
        const completas = accProgress.filter((c) => c.porcentaje === 100).length;
        const porcentaje =
          accProgress.length > 0
            ? Math.round((accProgress.filter((c) => c.subidos > 0).length / accProgress.length) * 100)
            : 0;
        setAcreditacion({ porcentaje, completas, total: accProgress.length });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">
          Bienvenido{profile?.nombre ? `, ${profile.nombre}` : ""}
        </h1>
        <p className="text-teal-100 text-sm">Panel de administración — FichaEleam</p>
      </div>

      {/* Stats residentes */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Residentes</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={loading ? "..." : stats.total} color="text-gray-800" onClick={() => navigate("/residents")} />
        <StatCard label="Activos" value={loading ? "..." : stats.activos} color="text-green-600" onClick={() => navigate("/residents")} />
        <StatCard label="Hospitalizados" value={loading ? "..." : stats.hospitalizados} color="text-yellow-600" onClick={() => navigate("/residents")} />
        <StatCard label="Egresados" value={loading ? "..." : stats.egresados} color="text-gray-500" onClick={() => navigate("/residents")} />
      </div>

      {/* Acreditación */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Acreditación SEREMI</h2>
      <div
        onClick={() => navigate("/accreditation")}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Progreso de documentación</span>
          <span className="text-xl font-bold text-[var(--color-primary)]">
            {loading ? "..." : `${acreditacion.porcentaje}%`}
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

      {/* Acciones rápidas */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Acciones rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon="👴" label="Agregar Residente" onClick={() => navigate("/residents/new")} />
        <QuickAction icon="📊" label="Registrar Signos Vitales" onClick={() => navigate("/vital-signs/new")} />
        <QuickAction icon="📋" label="Nueva Observación" onClick={() => navigate("/observations/new")} />
        <QuickAction icon="📁" label="Subir Documento Acreditación" onClick={() => navigate("/accreditation/upload")} />
        <QuickAction icon="👥" label="Ver Residentes" onClick={() => navigate("/residents")} />
        <QuickAction icon="💓" label="Historial Signos Vitales" onClick={() => navigate("/vital-signs")} />
        <QuickAction icon="📝" label="Ver Observaciones" onClick={() => navigate("/observations")} />
        <QuickAction icon="🏥" label="Panel Acreditación" onClick={() => navigate("/accreditation")} />
      </div>
    </div>
  );
}

export default AdminDashboard;
