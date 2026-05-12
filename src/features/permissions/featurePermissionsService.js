import { supabase } from "../../services/supabaseConfig";
import { featureDefaultMap, featuresForRole } from "./featureCatalog";

function rowsToMap(rows = []) {
  return Object.fromEntries((rows ?? []).map((row) => [row.feature_id, row.enabled !== false]));
}

export async function getEleamRoleFeaturePermissions(eleamId, role) {
  if (!eleamId || !role) return featureDefaultMap(role);
  const { data, error } = await supabase
    .from("eleam_feature_permissions")
    .select("feature_id, enabled")
    .eq("eleam_id", eleamId)
    .eq("rol", role);
  if (error) throw error;
  return featureDefaultMap(role, rowsToMap(data));
}

export async function getEleamFeaturePermissions(eleamId) {
  if (!eleamId) return {};
  const { data, error } = await supabase
    .from("eleam_feature_permissions")
    .select("rol, feature_id, enabled")
    .eq("eleam_id", eleamId);
  if (error) throw error;

  const out = {};
  for (const role of ["admin_eleam", "funcionario", "familiar"]) {
    out[role] = featureDefaultMap(role);
  }
  for (const row of data ?? []) {
    if (!out[row.rol]) out[row.rol] = {};
    out[row.rol][row.feature_id] = row.enabled !== false;
  }
  return out;
}

export async function saveEleamRoleFeaturePermissions(eleamId, role, permissions) {
  if (!eleamId || !role) throw new Error("ELEAM y rol son obligatorios.");
  const rows = featuresForRole(role).map((feature) => ({
    eleam_id: eleamId,
    rol: role,
    feature_id: feature.id,
    enabled: permissions?.[feature.id] !== false,
    actualizado_en: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("eleam_feature_permissions")
    .upsert(rows, { onConflict: "eleam_id,rol,feature_id" })
    .select();
  if (error) throw error;
  return data ?? [];
}

export async function getProfileFeaturePermissions(profileId, role, roleDefaults = null) {
  if (!profileId || !role) return featureDefaultMap(role, roleDefaults ?? {});
  const { data, error } = await supabase
    .from("profile_feature_permissions")
    .select("feature_id, enabled")
    .eq("profile_id", profileId);
  if (error) throw error;
  return featureDefaultMap(role, { ...(roleDefaults ?? {}), ...rowsToMap(data) });
}

export async function saveProfileFeaturePermissions(profileId, role, permissions) {
  if (!profileId || !role) throw new Error("Usuario y rol son obligatorios.");
  const rows = featuresForRole(role).map((feature) => ({
    profile_id: profileId,
    feature_id: feature.id,
    enabled: permissions?.[feature.id] !== false,
    actualizado_en: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("profile_feature_permissions")
    .upsert(rows, { onConflict: "profile_id,feature_id" })
    .select();
  if (error) throw error;
  return data ?? [];
}

