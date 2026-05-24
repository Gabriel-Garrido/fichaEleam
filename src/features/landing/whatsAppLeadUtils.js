import { validateEmail } from "../../utils/validators";

export const WHATSAPP_PHONE = "56951187764";
export const WHATSAPP_CARGO_TAG = "Contacto WhatsApp";
export const WHATSAPP_UTM_SOURCE = "whatsapp";
export const WHATSAPP_UTM_MEDIUM = "floating_button";

export const WHATSAPP_FIELD_LIMITS = {
  nombre: 120,
  eleam_nombre: 160,
  email: 254,
  telefono: 40,
  utm_medium: 128,
  utm_campaign: 128,
  pagina_origen: 256,
  referrer: 512,
};

function cleanText(value = "", max = Number.POSITIVE_INFINITY) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : "";
}

function cleanOptional(value, max) {
  const text = cleanText(value, max);
  return text || null;
}

export function validateWhatsAppLeadForm(form = {}) {
  const errs = {};
  const nombre = cleanText(form.nombre, WHATSAPP_FIELD_LIMITS.nombre + 1);
  const eleamNombre = cleanText(form.eleam_nombre, WHATSAPP_FIELD_LIMITS.eleam_nombre + 1);
  const email = cleanText(form.email, WHATSAPP_FIELD_LIMITS.email + 1).toLowerCase();
  const telefono = cleanText(form.telefono, WHATSAPP_FIELD_LIMITS.telefono + 1);

  if (!nombre) errs.nombre = "Requerido";
  else if (nombre.length > WHATSAPP_FIELD_LIMITS.nombre) errs.nombre = "Máximo 120 caracteres";

  if (!eleamNombre) errs.eleam_nombre = "Requerido";
  else if (eleamNombre.length > WHATSAPP_FIELD_LIMITS.eleam_nombre) {
    errs.eleam_nombre = "Máximo 160 caracteres";
  }

  if (email.length > WHATSAPP_FIELD_LIMITS.email) errs.email = "Máximo 254 caracteres";
  else if (!validateEmail(email)) errs.email = "Email no válido";

  const phoneDigits = telefono.replace(/[^0-9+]/g, "");
  if (!phoneDigits || phoneDigits.length < 8) errs.telefono = "Ingresa un teléfono válido";
  else if (telefono.length > WHATSAPP_FIELD_LIMITS.telefono) errs.telefono = "Máximo 40 caracteres";

  return errs;
}

export function normalizeWhatsAppLeadForm(form = {}, context = {}) {
  const email = cleanText(form.email).toLowerCase();

  return {
    p_nombre: cleanText(form.nombre, WHATSAPP_FIELD_LIMITS.nombre),
    p_cargo: WHATSAPP_CARGO_TAG,
    p_eleam_nombre: cleanText(form.eleam_nombre, WHATSAPP_FIELD_LIMITS.eleam_nombre),
    p_email: cleanText(email, WHATSAPP_FIELD_LIMITS.email),
    p_telefono: cleanText(form.telefono, WHATSAPP_FIELD_LIMITS.telefono),
    p_num_residentes: null,
    p_utm_source: WHATSAPP_UTM_SOURCE,
    p_utm_medium: cleanOptional(context.utm_medium ?? WHATSAPP_UTM_MEDIUM, WHATSAPP_FIELD_LIMITS.utm_medium),
    p_utm_campaign: cleanOptional(context.utm_campaign, WHATSAPP_FIELD_LIMITS.utm_campaign),
    p_pagina_origen: cleanOptional(context.pagina_origen, WHATSAPP_FIELD_LIMITS.pagina_origen),
    p_referrer: cleanOptional(context.referrer, WHATSAPP_FIELD_LIMITS.referrer),
  };
}

const INTENT_LINE = {
  institutional: "Tenemos más de 35 residentes y quisiera una cotización personalizada.",
  pricing: "Quisiera más información sobre los planes de FichaEleam.",
};

export function buildWhatsAppMessage(form = {}, source = "general") {
  const nombre = cleanText(form.nombre);
  const eleam = cleanText(form.eleam_nombre);
  const email = cleanText(form.email);
  const telefono = cleanText(form.telefono);

  const intent = INTENT_LINE[source] ?? "Me gustaría conocer más sobre FichaEleam.";

  const lines = [
    `Hola, soy ${nombre || "(nombre)"} de ${eleam || "(ELEAM)"}.`,
    intent,
    "",
    "Datos de contacto:",
  ];
  if (email) lines.push(`- Correo: ${email}`);
  if (telefono) lines.push(`- Teléfono: ${telefono}`);
  return lines.join("\n");
}

export function buildWhatsAppUrl(form = {}, phone = WHATSAPP_PHONE, source = "general") {
  const cleanPhone = String(phone).replace(/[^0-9]/g, "");
  const text = encodeURIComponent(buildWhatsAppMessage(form, source));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

export function isWhatsAppLead(lead = {}) {
  return lead?.utm_source === WHATSAPP_UTM_SOURCE || lead?.cargo === WHATSAPP_CARGO_TAG;
}
