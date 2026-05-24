import { validateEmail } from "../../utils/validators";

const FIELD_LIMITS = {
  nombre: 120,
  cargo: 80,
  eleam_nombre: 160,
  email: 254,
  telefono: 40,
  num_residentes: 40,
  utm: 128,
  pagina_origen: 256,
  referrer: 512,
};

function cleanText(value, max) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : "";
}

function cleanOptional(value, max) {
  const text = cleanText(value, max);
  return text || null;
}

export function normalizeDemoLeadForm(form = {}, context = {}) {
  const email = cleanText(form.email, FIELD_LIMITS.email).toLowerCase();
  const telefono = cleanText(form.telefono, FIELD_LIMITS.telefono);

  return {
    p_nombre: cleanText(form.nombre, FIELD_LIMITS.nombre),
    p_cargo: cleanText(form.cargo, FIELD_LIMITS.cargo),
    p_eleam_nombre: cleanText(form.eleam_nombre, FIELD_LIMITS.eleam_nombre),
    p_email: email,
    p_telefono: telefono,
    p_num_residentes: cleanOptional(form.num_residentes, FIELD_LIMITS.num_residentes),
    p_utm_source: cleanOptional(context.utm_source, FIELD_LIMITS.utm),
    p_utm_medium: cleanOptional(context.utm_medium, FIELD_LIMITS.utm),
    p_utm_campaign: cleanOptional(context.utm_campaign, FIELD_LIMITS.utm),
    p_pagina_origen: cleanOptional(context.pagina_origen, FIELD_LIMITS.pagina_origen),
    p_referrer: cleanOptional(context.referrer, FIELD_LIMITS.referrer),
  };
}

export function validateDemoLeadForm(form = {}) {
  const errs = {};
  const nombre = cleanText(form.nombre, FIELD_LIMITS.nombre + 1);
  const cargo = cleanText(form.cargo, FIELD_LIMITS.cargo + 1);
  const eleamNombre = cleanText(form.eleam_nombre, FIELD_LIMITS.eleam_nombre + 1);
  const email = cleanText(form.email, FIELD_LIMITS.email + 1);
  const telefono = cleanText(form.telefono, FIELD_LIMITS.telefono + 1);

  if (!nombre) errs.nombre = "Requerido";
  else if (nombre.length > FIELD_LIMITS.nombre) errs.nombre = "Máximo 120 caracteres";

  if (!cargo) errs.cargo = "Selecciona tu cargo";
  else if (cargo.length > FIELD_LIMITS.cargo) errs.cargo = "Máximo 80 caracteres";

  if (!eleamNombre) errs.eleam_nombre = "Requerido";
  else if (eleamNombre.length > FIELD_LIMITS.eleam_nombre) errs.eleam_nombre = "Máximo 160 caracteres";

  if (email.length > FIELD_LIMITS.email) errs.email = "Máximo 254 caracteres";
  else if (!validateEmail(email)) errs.email = "Email no válido";

  const phoneDigits = telefono.replace(/[^0-9+]/g, "");
  if (!phoneDigits || phoneDigits.length < 8) errs.telefono = "Ingresa un teléfono válido";
  else if (telefono.length > FIELD_LIMITS.telefono) errs.telefono = "Máximo 40 caracteres";

  return errs;
}
