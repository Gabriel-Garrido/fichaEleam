import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../../components/Toast";
import Loading from "../../../components/Loading";
import { friendlyError } from "../../../utils/errorMessages";
import {
  getPostById, createPost, updatePost,
  slugify, estimateReadingMinutes,
} from "../../blog/blogService";
import { renderMarkdown } from "../../blog/utils/markdown";

const empty = {
  titulo: "",
  slug: "",
  resumen: "",
  contenido_md: "",
  cover_url: "",
  cover_alt: "",
  meta_title: "",
  meta_description: "",
  keywords: "",            // se separa por comas
  estado: "borrador",
  destacado: false,
  autor_nombre: "Equipo FichaEleam",
};

export default function BlogEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreview] = useState(false);

  const load = useCallback(async () => {
    if (!isEditing) return;
    try {
      const p = await getPostById(id);
      if (!p) throw new Error("Post no encontrado.");
      setForm({
        ...empty,
        ...p,
        keywords: (p.keywords ?? []).join(", "),
        cover_url: p.cover_url ?? "",
        cover_alt: p.cover_alt ?? "",
        meta_title: p.meta_title ?? "",
        meta_description: p.meta_description ?? "",
      });
    } catch (e) {
      toast(friendlyError(e, "No se pudo cargar el artículo. Recarga la página."), "error");
      navigate("/superadmin/blog");
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, toast, navigate]);

  useEffect(() => { load(); }, [load]);

  const set = (patch) => setForm((p) => ({ ...p, ...patch }));

  const handleSlugFromTitle = () => {
    if (!form.slug && form.titulo) set({ slug: slugify(form.titulo) });
  };

  const validate = () => {
    if (!form.titulo.trim()) return "El título es obligatorio.";
    if (!form.resumen.trim()) return "El resumen es obligatorio.";
    if (!form.contenido_md.trim()) return "El contenido no puede estar vacío.";
    if (form.titulo.length > 200) return "El título es demasiado largo (máx 200).";
    if (form.resumen.length > 500) return "El resumen es demasiado largo (máx 500).";
    return null;
  };

  const buildPayload = () => ({
    ...form,
    titulo: form.titulo.trim(),
    resumen: form.resumen.trim(),
    slug: (form.slug || slugify(form.titulo)).trim(),
    cover_url: form.cover_url?.trim() || null,
    cover_alt: form.cover_alt?.trim() || null,
    meta_title: form.meta_title?.trim() || null,
    meta_description: form.meta_description?.trim() || null,
    keywords: form.keywords,
    publicado_en: form.estado === "publicado" && !form.publicado_en
      ? new Date().toISOString()
      : (form.publicado_en ?? null),
  });

  const save = async (publishNow) => {
    const err = validate();
    if (err) { toast(err, "error"); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (publishNow) {
        payload.estado = "publicado";
        payload.publicado_en = payload.publicado_en ?? new Date().toISOString();
      }
      const result = isEditing
        ? await updatePost(id, payload)
        : await createPost(payload);
      toast(publishNow ? "Post publicado." : "Cambios guardados.", "success");
      navigate(`/superadmin/blog/${result.id}/edit`);
    } catch (e) {
      toast(friendlyError(e, "No se pudo guardar el artículo. Verifica los datos e intenta de nuevo."), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando editor..." />;

  const readingMin = estimateReadingMinutes(form.contenido_md);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-end justify-between gap-3 mb-6 flex-wrap">
        <div>
          <button type="button" onClick={() => navigate("/superadmin/blog")} className="text-sm text-slate-500 hover:underline">
            ← Volver al listado
          </button>
          <h1 className="text-2xl font-black text-slate-800 mt-2">
            {isEditing ? "Editar post" : "Nuevo post"}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button"
            onClick={() => setPreview((s) => !s)}
            className="border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm hover:bg-slate-50"
          >
            {previewing ? "Editor" : "Vista previa"}
          </button>
          <button type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar borrador"}
          </button>
          <button type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            Publicar
          </button>
        </div>
      </header>

      {previewing ? (
        <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{form.keywords}</p>
          <h1 className="text-4xl font-black text-slate-900 mb-4">{form.titulo}</h1>
          <p className="text-lg text-slate-500 mb-6">{form.resumen}</p>
          {form.cover_url && (
            <img src={form.cover_url} alt={form.cover_alt} className="rounded-xl mb-8" />
          )}
          <div className="prose-clean">{renderMarkdown(form.contenido_md)}</div>
        </article>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Section label="Título *">
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => set({ titulo: e.target.value })}
                onBlur={handleSlugFromTitle}
                placeholder="Ej. DS 14/2017 explicado: qué exige la SEREMI..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-base"
                maxLength={200}
              />
              <p className="text-[11px] text-slate-400 mt-1">{form.titulo.length}/200</p>
            </Section>
            <Section label="Slug (URL)">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">/blog/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => set({ slug: slugify(e.target.value) })}
                  placeholder="ds-14-2017-fiscalizacion-seremi"
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
            </Section>
            <Section label="Resumen *" hint="Aparece en el listado y en meta description si la dejas vacía. Apunta a 140-160 caracteres.">
              <textarea
                value={form.resumen}
                onChange={(e) => set({ resumen: e.target.value })}
                rows={3}
                maxLength={500}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">{form.resumen.length}/500</p>
            </Section>
            <Section label="Contenido (Markdown) *" hint={`Tiempo de lectura estimado: ${readingMin} min`}>
              <textarea
                value={form.contenido_md}
                onChange={(e) => set({ contenido_md: e.target.value })}
                rows={20}
                placeholder={"## Subtítulo\n\nPárrafo con **negritas** y [link](https://...).\n\n- Lista\n- Otro ítem\n\n```\ncódigo\n```"}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Soporta # H1, ## H2, ### H3, **bold**, *italic*, listas, [links](url),
                tablas, blockquotes y bloques de código.
              </p>
            </Section>
          </div>

          <div className="space-y-4">
            <Section label="Estado">
              <select
                value={form.estado}
                onChange={(e) => set({ estado: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
                <option value="archivado">Archivado</option>
              </select>
            </Section>

            <Section label="Destacado">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.destacado}
                  onChange={(e) => set({ destacado: e.target.checked })}
                  className="w-4 h-4 accent-slate-600"
                />
                Mostrar como destacado en el blog
              </label>
            </Section>

            <Section label="Imagen de portada (URL)">
              <input
                type="url"
                value={form.cover_url}
                onChange={(e) => set({ cover_url: e.target.value })}
                placeholder="https://…"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              {form.cover_url && (
                <img src={form.cover_url} alt="" className="mt-2 rounded-xl max-h-32 border border-slate-100" />
              )}
            </Section>
            <Section label="Texto alt de la portada (accesibilidad)">
              <input
                type="text"
                value={form.cover_alt}
                onChange={(e) => set({ cover_alt: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </Section>

            <Section label="Autor">
              <input
                type="text"
                value={form.autor_nombre}
                onChange={(e) => set({ autor_nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </Section>

            <details className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                SEO avanzado
              </summary>
              <div className="mt-3 space-y-3">
                <Section label="Meta title" hint="Si lo dejas vacío, se usa el título.">
                  <input
                    type="text"
                    value={form.meta_title}
                    onChange={(e) => set({ meta_title: e.target.value })}
                    maxLength={70}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(form.meta_title?.length ?? 0)}/70
                  </p>
                </Section>
                <Section label="Meta description" hint="Si lo dejas vacío, se usa el resumen.">
                  <textarea
                    value={form.meta_description}
                    onChange={(e) => set({ meta_description: e.target.value })}
                    rows={2}
                    maxLength={170}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(form.meta_description?.length ?? 0)}/170
                  </p>
                </Section>
                <Section label="Keywords (separados por coma)">
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => set({ keywords: e.target.value })}
                    placeholder="ELEAM, DS 14/2017, fiscalización SEREMI"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </Section>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, hint, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
