import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, uploadAccreditationDocument } from "./accreditationService";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

function AccreditationUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCat = searchParams.get("categoriaId");

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoriaId: preselectedCat ?? "",
    nombre: "",
    descripcion: "",
    fechaVencimiento: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.categoriaId) { setError("Debe seleccionar una categoría."); return; }
    if (!form.nombre.trim()) { setError("El nombre del documento es obligatorio."); return; }
    setSaving(true);
    try {
      await uploadAccreditationDocument({
        categoriaId: form.categoriaId,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        fechaVencimiento: form.fechaVencimiento || null,
        file: file || null,
      });
      navigate(`/accreditation/category/${form.categoriaId}`);
    } catch (err) {
      setError("Error al subir documento: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingCats) return <Loading message="Cargando categorías..." />;

  const selectedCat = categories.find((c) => c.id === form.categoriaId);
  const requiredDocs = selectedCat?.documentos_requeridos ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-primary)] hover:underline text-sm">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Subir Documento de Acreditación</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Información del documento</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Categoría *</label>
              <select name="categoriaId" value={form.categoriaId} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar categoría...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>[{c.codigo}] {c.nombre}</option>
                ))}
              </select>
            </div>

            {requiredDocs.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Documentos requeridos en esta categoría:</p>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {requiredDocs.map((d, i) => <li key={i}>• {d}</li>)}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nombre del documento *</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required
                placeholder="Ej: Resolución de autorización sanitaria 2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Descripción</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                placeholder="Descripción opcional del documento..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
              <input type="date" name="fechaVencimiento" value={form.fechaVencimiento} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
          </div>
        </section>

        {/* Zona de carga de archivo */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Archivo (opcional)</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? "border-[var(--color-primary)] bg-teal-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <p className="font-medium text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">☁️</div>
                <p className="text-sm text-gray-600 mb-2">Arrastra y suelta un archivo aquí, o</p>
                <label className="cursor-pointer text-sm text-[var(--color-primary)] hover:underline">
                  selecciona desde tu computador
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files[0] ?? null)}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes (máx. 10 MB)</p>
              </div>
            )}
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] disabled:opacity-50">
            {saving ? "Subiendo..." : "Guardar Documento"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AccreditationUpload;
