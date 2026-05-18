import { validateEmail } from "../../utils/validators";

export function normalizeDemoLeadForm(form = {}, context = {}) {
  const email = String(form.email ?? "").trim().toLowerCase();
  const telefono = String(form.telefono ?? "").trim().replace(/\s+/g, " ");

  return {
    p_nombre: String(form.nombre ?? "").trim(),
    p_cargo: String(form.cargo ?? "").trim(),
    p_eleam_nombre: String(form.eleam_nombre ?? "").trim(),
    p_email: email,
    p_telefono: telefono,
    p_num_residentes: form.num_residentes || null,
    p_utm_source: context.utm_source ?? null,
    p_utm_medium: context.utm_medium ?? null,
    p_utm_campaign: context.utm_campaign ?? null,
    p_pagina_origen: context.pagina_origen ?? null,
    p_referrer: context.referrer ?? null,
  };
}

export function validateDemoLeadForm(form = {}) {
  const errs = {};
  if (!String(form.nombre ?? "").trim()) errs.nombre = "Requerido";
  if (!String(form.cargo ?? "").trim()) errs.cargo = "Selecciona tu cargo";
  if (!String(form.eleam_nombre ?? "").trim()) errs.eleam_nombre = "Requerido";
  if (!validateEmail(String(form.email ?? "").trim())) errs.email = "Email no válido";

  const phoneDigits = String(form.telefono ?? "").replace(/[^0-9+]/g, "");
  if (!phoneDigits || phoneDigits.length < 8) errs.telefono = "Ingresa un teléfono válido";

  return errs;
}
