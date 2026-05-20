import { validateEmail } from "../../utils/validators";

export const WHATSAPP_PHONE = "56951187764";
export const WHATSAPP_CARGO_TAG = "Contacto WhatsApp";
export const WHATSAPP_UTM_SOURCE = "whatsapp";
export const WHATSAPP_UTM_MEDIUM = "floating_button";

export function validateWhatsAppLeadForm(form = {}) {
  const errs = {};
  if (!String(form.nombre ?? "").trim()) errs.nombre = "Requerido";
  if (!String(form.eleam_nombre ?? "").trim()) errs.eleam_nombre = "Requerido";
  if (!validateEmail(String(form.email ?? "").trim())) errs.email = "Email no válido";

  const phoneDigits = String(form.telefono ?? "").replace(/[^0-9+]/g, "");
  if (!phoneDigits || phoneDigits.length < 8) errs.telefono = "Ingresa un teléfono válido";

  return errs;
}

export function normalizeWhatsAppLeadForm(form = {}, context = {}) {
  const email = String(form.email ?? "").trim().toLowerCase();
  const telefono = String(form.telefono ?? "").trim().replace(/\s+/g, " ");

  return {
    p_nombre: String(form.nombre ?? "").trim(),
    p_cargo: WHATSAPP_CARGO_TAG,
    p_eleam_nombre: String(form.eleam_nombre ?? "").trim(),
    p_email: email,
    p_telefono: telefono,
    p_num_residentes: null,
    p_utm_source: WHATSAPP_UTM_SOURCE,
    p_utm_medium: context.utm_medium ?? WHATSAPP_UTM_MEDIUM,
    p_utm_campaign: context.utm_campaign ?? null,
    p_pagina_origen: context.pagina_origen ?? null,
    p_referrer: context.referrer ?? null,
  };
}

export function buildWhatsAppMessage(form = {}) {
  const nombre = String(form.nombre ?? "").trim();
  const eleam = String(form.eleam_nombre ?? "").trim();
  const email = String(form.email ?? "").trim();
  const telefono = String(form.telefono ?? "").trim();

  const lines = [
    `Hola, soy ${nombre || "(nombre)"} de ${eleam || "(ELEAM)"}.`,
    "Me gustaría conocer más sobre FichaEleam.",
    "",
    "Datos de contacto:",
  ];
  if (email) lines.push(`- Correo: ${email}`);
  if (telefono) lines.push(`- Teléfono: ${telefono}`);
  return lines.join("\n");
}

export function buildWhatsAppUrl(form = {}, phone = WHATSAPP_PHONE) {
  const cleanPhone = String(phone).replace(/[^0-9]/g, "");
  const text = encodeURIComponent(buildWhatsAppMessage(form));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

export function isWhatsAppLead(lead = {}) {
  return lead?.utm_source === WHATSAPP_UTM_SOURCE || lead?.cargo === WHATSAPP_CARGO_TAG;
}
