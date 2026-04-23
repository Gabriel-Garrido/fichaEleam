import { supabase } from "../../services/supabaseConfig";

const SIGNED_URL_EXPIRY = 60 * 60; // 1 hora en segundos

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._\-áéíóúÁÉÍÓÚñÑ ]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/\//g, "_")
    .replace(/\\/g, "_")
    .substring(0, 100);
}

export const getCategories = async () => {
  const { data, error } = await supabase
    .from("categorias_acreditacion")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const getDocumentsByCategory = async (categoriaId) => {
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .select("*")
    .eq("categoria_id", categoriaId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const getAllDocuments = async () => {
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .select("*, categorias_acreditacion(nombre, codigo, orden)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const getSignedUrl = async (storagePath) => {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from("documentos-acreditacion")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
  if (error) return null;
  return data.signedUrl;
};

export const uploadAccreditationDocument = async ({
  categoriaId,
  nombre,
  descripcion,
  fechaVencimiento,
  file,
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado.");

  let storagePath = null;
  let archivoNombre = null;
  let archivoTipo = null;
  let archivoTamaño = null;

  if (file) {
    const safeName = sanitizeFilename(file.name);
    storagePath = `acreditacion/${categoriaId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos-acreditacion")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    archivoNombre = file.name;
    archivoTipo = file.type;
    archivoTamaño = file.size;
  }

  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .insert({
      categoria_id: categoriaId,
      nombre,
      descripcion: descripcion || null,
      storage_path: storagePath,
      archivo_nombre: archivoNombre,
      archivo_tipo: archivoTipo,
      archivo_tamaño: archivoTamaño,
      fecha_vencimiento: fechaVencimiento || null,
      estado: file ? "subido" : "pendiente",
      subido_por: user.id,
    })
    .select()
    .single();

  if (error) {
    if (storagePath) {
      await supabase.storage.from("documentos-acreditacion").remove([storagePath]);
    }
    throw error;
  }
  return data;
};

export const updateDocumentStatus = async (id, estado, observaciones = null) => {
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .update({ estado, observaciones, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteDocument = async (id, storagePath) => {
  if (storagePath) {
    await supabase.storage.from("documentos-acreditacion").remove([storagePath]);
  }
  const { error } = await supabase.from("documentos_acreditacion").delete().eq("id", id);
  if (error) throw error;
};

export const getAccreditationProgress = async () => {
  const [{ data: categories, error: catError }, { data: docs, error: docsError }] =
    await Promise.all([
      supabase.from("categorias_acreditacion").select("id, nombre, codigo, orden"),
      supabase.from("documentos_acreditacion").select("categoria_id, estado"),
    ]);

  if (catError) throw catError;
  if (docsError) throw docsError;

  const categoriesList = categories ?? [];
  const docsList = docs ?? [];

  return categoriesList.map((cat) => {
    const catDocs = docsList.filter((d) => d.categoria_id === cat.id);
    const subidos = catDocs.filter((d) => ["subido", "aprobado"].includes(d.estado)).length;
    return {
      ...cat,
      total: catDocs.length,
      subidos,
      porcentaje: catDocs.length > 0 ? Math.round((subidos / catDocs.length) * 100) : 0,
    };
  });
};
