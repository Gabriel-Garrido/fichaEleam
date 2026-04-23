import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCategories,
  getDocumentsByCategory,
  updateDocumentStatus,
  deleteDocument,
  getSignedUrl,
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
  const [signedUrls, setSignedUrls] = useState({});
  const [loadingUrl, setLoadingUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCategories(), getDocumentsByCategory(id)])
      .then(([cats, docs]) => {
        setCategory(cats.find((c) => c.id === id) ?? null);
        setDocuments(docs);
      })
      .catch(() => setError("Error al cargar la categoría."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleViewFile = async (docId, storagePath) => {
    if (signedUrls[docId]) {
      window.open(signedUrls[docId], "_blank", "noopener,noreferrer");
      return;
    }
    setLoadingUrl(docId);
    try {
      const url = await getSignedUrl(storagePath);
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [docId]: url }));
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setError("No se pudo generar el enlace de descarga.");
      }
    } catch {
      setError("Error al obtener el enlace del archivo.");
    } finally {
      setLoadingUrl(null);
    }
  };

  const handleDelete = async (docId, storagePath) => {
    if (!window.confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDocument(docId, storagePath);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSignedUrls((prev) => { const n = { ...prev }; delete n[docId]; return n; });
    } catch {
      setError("Error al eliminar el documento.");
    }
  };

  const handleStatusChange = async (docId, nuevoEstado) => {
    try {
      const updated = await updateDocumentStatus(docId, nuevoEstado);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    } catch {
      setError("Error al actualizar el estado.");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <Loading message="Cargando categoría..." />;
  if (!category) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
      <p className="text-xl">Categoría no encontrada.</p>
      <button onClick={() => navigate("/accreditation")} className="mt-4 text-[var(--color-primary)] hover:underline">
        ← Volver
      </button>
    </div>
  );

  const requiredDocs = Array.isArray(category.documentos_requeridos)
    ? category.documentos_requeridos
    : [];

  const uploadedNames = documents.map((d) => (d.nombre ?? "").toLowerCase());

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={() => navigate("/accreditation")}
        className="text-[var(--color-primary)] hover:underline text-sm mb-6 inline-flex items-center gap-1"
      >
        ← Volver a acreditación
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {/* Checklist de documentos requeridos */}
      {requiredDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-amber-800 mb-3 text-sm flex items-center gap-2">
            📋 Documentos requeridos para fiscalización SEREMI
          </h3>
          <ul className="space-y-1.5">
            {requiredDocs.map((req, i) => {
              const encontrado = uploadedNames.some(
                (n) => n.includes(req.toLowerCase().substring(0, 12))
              );
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 font-bold ${encontrado ? "text-green-600" : "text-amber-400"}`}>
                    {encontrado ? "✓" : "○"}
                  </span>
                  <span className={encontrado ? "text-green-800 line-through decoration-green-400" : "text-amber-800"}>
                    {req}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-amber-600 mt-3">
            {uploadedNames.length} de {requiredDocs.length} documentos cargados
          </p>
        </div>
      )}

      {/* Lista de documentos */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">
          Documentos cargados ({documents.length})
        </h2>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-3">📁</div>
          <p className="mb-1 font-medium">No hay documentos en esta categoría.</p>
          <p className="text-sm mb-4">Sube el primer documento para comenzar.</p>
          <Button
            onClick={() => navigate(`/accreditation/upload?categoriaId=${id}`)}
            className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm hover:bg-[var(--color-button-hover)]"
          >
            + Subir primer documento
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-800 truncate">{doc.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ESTADO_STYLES[doc.estado] ?? "bg-gray-100 text-gray-600"}`}>
                      {ESTADO_LABEL[doc.estado] ?? doc.estado}
                    </span>
                  </div>
                  {doc.descripcion && (
                    <p className="text-sm text-gray-500 mb-1">{doc.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                    {doc.archivo_nombre && (
                      <span>📎 {doc.archivo_nombre}{doc.archivo_tamaño ? ` (${formatSize(doc.archivo_tamaño)})` : ""}</span>
                    )}
                    {doc.fecha_vencimiento && (
                      <span className={new Date(doc.fecha_vencimiento + "T12:00:00") < new Date() ? "text-red-500 font-medium" : "text-gray-400"}>
                        Vence: {new Date(doc.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-CL")}
                      </span>
                    )}
                    <span>Subido: {new Date(doc.creado_en).toLocaleDateString("es-CL")}</span>
                  </div>
                  {doc.observaciones && (
                    <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 px-2 py-1 rounded">
                      Obs: {doc.observaciones}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex sm:flex-col gap-2 shrink-0 items-start sm:items-end">
                  {doc.storage_path && (
                    <button
                      onClick={() => handleViewFile(doc.id, doc.storage_path)}
                      disabled={loadingUrl === doc.id}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {loadingUrl === doc.id ? "Cargando..." : "Ver archivo"}
                    </button>
                  )}
                  <select
                    value={doc.estado}
                    onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] bg-white"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="subido">Subido</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                  <button
                    onClick={() => handleDelete(doc.id, doc.storage_path)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
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
