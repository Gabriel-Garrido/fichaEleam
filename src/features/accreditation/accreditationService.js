import { supabase } from "../../services/supabaseConfig";

export const getCategories = async () => {
  const { data, error } = await supabase
    .from("categorias_acreditacion")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw error;
  return data;
};

export const getDocumentsByCategory = async (categoriaId) => {
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .select("*")
    .eq("categoria_id", categoriaId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data;
};

export const getAllDocuments = async () => {
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .select("*, categorias_acreditacion(nombre, codigo, orden)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data;
};

export const uploadAccreditationDocument = async ({ categoriaId, nombre, descripcion, fechaVencimiento, file }) => {
  const { data: { user } } = await supabase.auth.getUser();

  let archivoUrl = null;
  let archivoNombre = null;
  let archivoTipo = null;
  let archivoTamaño = null;

  if (file) {
    const path = `acreditacion/${categoriaId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documentos-acreditacion")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("documentos-acreditacion")
      .getPublicUrl(path);

    archivoUrl = publicUrl;
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
      archivo_url: archivoUrl,
      archivo_nombre: archivoNombre,
      archivo_tipo: archivoTipo,
      archivo_tamaño: archivoTamaño,
      fecha_vencimiento: fechaVencimiento || null,
      estado: file ? "subido" : "pendiente",
      subido_por: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
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

export const deleteDocument = async (id, archivoUrl) => {
  if (archivoUrl) {
    const path = archivoUrl.split("/documentos-acreditacion/")[1];
    if (path) {
      await supabase.storage.from("documentos-acreditacion").remove([path]);
    }
  }
  const { error } = await supabase.from("documentos_acreditacion").delete().eq("id", id);
  if (error) throw error;
};

export const getAccreditationProgress = async () => {
  const { data: categories } = await supabase
    .from("categorias_acreditacion")
    .select("id, nombre, codigo, orden");

  const { data: docs } = await supabase
    .from("documentos_acreditacion")
    .select("categoria_id, estado");

  return categories.map((cat) => {
    const catDocs = docs.filter((d) => d.categoria_id === cat.id);
    const subidos = catDocs.filter((d) => ["subido", "aprobado"].includes(d.estado)).length;
    return {
      ...cat,
      total: catDocs.length,
      subidos,
      porcentaje: catDocs.length > 0 ? Math.round((subidos / catDocs.length) * 100) : 0,
    };
  });
};
