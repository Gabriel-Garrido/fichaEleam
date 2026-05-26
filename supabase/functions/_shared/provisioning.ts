import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProvisionRole = "admin_eleam" | "funcionario" | "familiar";
export type ProvisionSource =
  | "demo_approved"
  | "superadmin_created"
  | "admin_created"
  | "funcionario_created";

export function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .slice(0, 12)
    .join("");
}

export function getAppUrl(): string {
  const rawAppUrl = Deno.env.get("PUBLIC_APP_URL")?.trim() || "https://fichaeleam.cl";
  return rawAppUrl.replace(/\/+$/, "");
}

export async function createAuthProvisionRequest(
  sb: SupabaseClient,
  {
    email,
    eleamId,
    rol,
    accountSource,
    residenteId = null,
  }: {
    email: string;
    eleamId: string;
    rol: ProvisionRole;
    accountSource: ProvisionSource;
    residenteId?: string | null;
  },
): Promise<{ id: string | null; error: unknown }> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("auth_provision_requests")
    .insert({
      email,
      account_source: accountSource,
      eleam_id: eleamId,
      rol,
      residente_id: residenteId,
      expira_en: expiresAt,
    })
    .select("id")
    .single();

  return { id: data?.id ?? null, error };
}

export async function deleteAuthProvisionRequest(sb: SupabaseClient, id: string | null) {
  if (!id) return;
  await sb.from("auth_provision_requests").delete().eq("id", id);
}

export async function generateAccessLink(
  sb: SupabaseClient,
  email: string,
): Promise<{ link: string | null; error: string | null }> {
  const { data, error } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${getAppUrl()}/reset-password` },
  });
  if (error) return { link: null, error: String(error.message ?? error) };
  const link = data?.properties?.action_link ?? null;
  if (!link) return { link: null, error: "No se pudo generar el enlace de acceso" };
  return { link, error: null };
}
