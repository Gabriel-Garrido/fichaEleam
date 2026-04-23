import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAccreditationProgress } from "./accreditationService";
import Loading from "../../components/Loading";
import Button from "../../components/Button";

const ESTADO_COLOR = {
  pendiente: "bg-gray-100 text-gray-600",
  subido: "bg-blue-100 text-blue-700",
  aprobado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  vencido: "bg-orange-100 text-orange-700",
};

function AccreditationDashboard() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAccreditationProgress()
      .then(setProgress)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCats = progress.length;
  const catsConDocs = progress.filter((p) => p.subidos > 0).length;
  const porcentajeGlobal = totalCats > 0 ? Math.round((catsConDocs / totalCats) * 100) : 0;

  if (loading) return <Loading message="Cargando panel de acreditación..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">Acreditación ELEAM</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de documentación según DS 14/2017 — Fiscalización SEREMI</p>
        </div>
        <Button
          onClick={() => navigate("/accreditation/upload")}
          className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
        >
          + Subir Documento
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {/* Progreso global */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-700">Progreso general de documentación</h2>
          <span className="text-2xl font-bold text-[var(--color-primary)]">{porcentajeGlobal}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-[var(--color-primary)] h-3 rounded-full transition-all duration-500"
            style={{ width: `${porcentajeGlobal}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {catsConDocs} de {totalCats} categorías con documentos subidos
        </p>
      </div>

      {/* Categorías */}
      <div className="grid gap-4">
        {progress.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/accreditation/category/${cat.id}`)}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {cat.codigo}
                  </span>
                  <h3 className="font-semibold text-gray-800">{cat.nombre}</h3>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-xs">
                    <div
                      className={`h-1.5 rounded-full transition-all ${cat.porcentaje === 100 ? "bg-green-500" : cat.porcentaje > 0 ? "bg-[var(--color-primary)]" : "bg-gray-300"}`}
                      style={{ width: `${cat.porcentaje}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {cat.subidos}/{cat.total} documentos
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cat.total === 0 ? (
                  <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Sin documentos</span>
                ) : cat.porcentaje === 100 ? (
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">✓ Completo</span>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">En progreso</span>
                )}
                <span className="text-[var(--color-primary)] text-sm">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Referencia normativa:</strong> La evaluación sigue los criterios del{" "}
          <strong>DS 14/2017</strong> (Reglamento de Establecimientos de Larga Estadía para Adultos Mayores)
          y las pautas de fiscalización de la SEREMI de Salud. Para más información, consulte con su director técnico.
        </p>
      </div>
    </div>
  );
}

export default AccreditationDashboard;
