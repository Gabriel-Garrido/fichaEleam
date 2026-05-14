import { supabase } from "../../services/supabaseConfig";

const BLOG_POST_SELECT = `
  id, slug, titulo, resumen, contenido_md,
  cover_url, cover_alt, meta_title, meta_description,
  keywords, estado, publicado_en, autor_nombre, autor_id,
  tiempo_lectura_min, views, destacado, creado_en, actualizado_en
`;

// ─────────────────────────────────────────────────────────────
// Lectura pública
// ─────────────────────────────────────────────────────────────

export async function getPublishedPosts({ limit = 50, destacadosFirst = true } = {}) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, titulo, resumen, cover_url, cover_alt, autor_nombre, tiempo_lectura_min, publicado_en, actualizado_en, keywords, destacado")
    .eq("estado", "publicado")
    .order("destacado", destacadosFirst ? { ascending: false } : { ascending: true })
    .order("publicado_en", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getRelatedPosts(currentSlug, keywords = [], limit = 3) {
  if (keywords.length > 0) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, titulo, resumen, cover_url, autor_nombre, tiempo_lectura_min, publicado_en, keywords")
      .eq("estado", "publicado")
      .neq("slug", currentSlug)
      .overlaps("keywords", keywords)
      .order("publicado_en", { ascending: false })
      .limit(limit);
    if (data?.length) return data;
  }
  // Fallback: artículos más recientes
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, titulo, resumen, cover_url, autor_nombre, tiempo_lectura_min, publicado_en, keywords")
    .eq("estado", "publicado")
    .neq("slug", currentSlug)
    .order("publicado_en", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPostBySlug(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  // Solo devolver post publicado al público; el superadmin verá todo igual.
  if (!data) return null;
  return data;
}

export async function incrementViews(slug) {
  if (!slug) return;
  // Best-effort. La RPC ignora silenciosamente si el post no está publicado.
  try {
    await supabase.rpc("blog_increment_views", { p_slug: slug });
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────
// Gestión (superadmin)
// ─────────────────────────────────────────────────────────────

export async function getAllPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPostById(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPost(payload) {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert(sanitizePayload(payload, { isCreate: true }))
    .select(BLOG_POST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePost(id, payload) {
  const { data, error } = await supabase
    .from("blog_posts")
    .update(sanitizePayload(payload))
    .eq("id", id)
    .select(BLOG_POST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(id) {
  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function publishPost(id, publish = true) {
  const payload = publish
    ? { estado: "publicado", publicado_en: new Date().toISOString() }
    : { estado: "borrador" };
  return updatePost(id, payload);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

export function estimateReadingMinutes(md) {
  if (!md) return 1;
  const words = md.replace(/[`*#>_![\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function sanitizePayload(p, { isCreate = false } = {}) {
  const out = { ...p };
  // Normalizar arreglos / strings
  if (out.keywords && typeof out.keywords === "string") {
    out.keywords = out.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  if (out.titulo) out.titulo = out.titulo.trim();
  if (out.resumen) out.resumen = out.resumen.trim();
  if (out.slug) out.slug = slugify(out.slug);
  if (!out.slug && isCreate && out.titulo) out.slug = slugify(out.titulo);
  if (out.contenido_md) out.tiempo_lectura_min = estimateReadingMinutes(out.contenido_md);
  // Quitar undefined
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}
