import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCategories,
  getDocumentsByCategory,
  updateDocumentStatus,
  deleteDocument,
} from "./accreditationService";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const ESTADO_STYLES = {
  pendiente: "bg-gray-100 text-gray-600",
  subido: "bg-blue-100 text-blue-700",
  aprobado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  vencido: "bg-orange-100 text-orange-700",
};

const ESTADO_LABEL = {
  pendiente: "Pendiente",
  subido: "Subido",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  vencido: "Vencido",
};

function AccreditationCategory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCategories(), getDocumentsByCategory(id)])
      .then(([cats, docs]) => {
        setCategory(cats.find((c) => c.id === id) ?? null);
        setDocuments(docs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async (docId, archivoUrl) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    try {
      await deleteDocument(docId, archivoUrl);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (docId, nuevoEstado) => {
    try {
      const updated = await updateDocumentStatus(docId, nuevoEstado);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    } catch (err) {
      setError(err.message);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <Loading message="Cargando categoría..." />;
  if (!category) return <div className="p-8 text-gray-500">Categoría no encontrada.</div>;

  const requiredDocs = Array.isArray(category.documentos_requeridos)
    ? category.documentos_requeridos
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/accreditation")} className="text-[var(--color-primary)] hover:underline text-sm">
          ← Volver a acreditación
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {category.codigo}
              </span>
              <h1 className="text-2xl font-bold text-gray-800">{category.nombre}</h1>
            </div>
            {category.descripcion && (
              <p className="text-gray-500 text-sm">{category.descripcion}</p>
            )}
          </div>
          <Button
            onClick={() => navigate(`/accreditation/upload?categoriaId=${id}`)}
            className="shrink-0 bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg hover:bg-[var(--color-button-hover)] text-sm"
          >
            + Subir Documento
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      {/* Documentos requeridos */}
      {requiredDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2 text-sm">
            📋 Documentos requeridos para esta categoría:
          </h3>
          <ul className="space-y-1">
            {requiredDocs.map((doc, i) => {
              const subido = documents.some(
                (d) => d.nombre.toLowerCase().includes(doc.toLowerCase().substring(0, 15))
              );
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className={subido ? "text-green-600" : "text-amber-500"}>
                    {subido ? "✓" : "○"}
                  </span>
                  {doc}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Documentos subidos */}
      <h2 className="font-semibold text-gray-700 mb-3">
        Documentos subidos ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📁</div>
          <p>No hay documentos subidos en esta categoría.</p>
          <Button
            onClick={() => navigate(`/accreditation/upload?categoriaId=${id}`)}
            className="mt-4 bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm"
          >
            Subir primer documento
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-800">{doc.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLES[doc.estado]}`}>
                      {ESTADO_LABEL[doc.estado]}
                    </span>
                  </div>
                  {doc.descripcion && (
                    <p className="text-sm text-gray-500 mb-1">{doc.descripcion}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400">
                    {doc.archivo_nombre && <span>📎 {doc.archivo_nombre} {doc.archivo_tamaño ? `(${formatSize(doc.archivo_tamaño)})` : ""}</span>}
                    {doc.fecha_vencimiento && (
                      <span className={new Date(doc.fecha_vencimiento) < new Date() ? "text-red-500" : ""}>
                        Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString("es-CL")}
                      </span>
                    )}
                    <span>Subido: {new Date(doc.creado_en).toLocaleDateString("es-CL")}</span>
                  </div>
                  {doc.observaciones && (
                    <p className="text-xs text-gray-500 mt-1 italic">Obs: {doc.observaciones}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {doc.archivo_url && (
                    <a
                      href={doc.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 text-center"
                    >
                      Ver archivo
                    </a>
                  )}
                  <select
                    value={doc.estado}
                    onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="subido">Subido</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                  <button
                    onClick={() => handleDelete(doc.id, doc.archivo_url)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AccreditationCategory;
