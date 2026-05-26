import { describe, expect, it } from "vitest";
import {
  PROSPECT_FORM_EMPTY,
  validateCampaignForm,
  validateProspectForm,
  validateProspectListForm,
} from "./crmEmailFormSchema";

describe("validateProspectForm", () => {
  it("requires eleam_nombre and normalizes minimal payload", () => {
    const result = validateProspectForm({ ...PROSPECT_FORM_EMPTY, eleam_nombre: "ELEAM Vista Hermosa" });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      eleam_nombre: "ELEAM Vista Hermosa",
      estado: "nuevo",
      email: null,
      telefono: null,
    });
  });

  it("rejects payload without eleam_nombre", () => {
    const result = validateProspectForm({ ...PROSPECT_FORM_EMPTY });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("eleam_nombre");
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      email: "  Contacto@EJEMPLO.cl  ",
    });
    expect(result.ok).toBe(true);
    expect(result.data.email).toBe("contacto@ejemplo.cl");
  });

  it("validates email format when present", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      email: "juan@@example",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("email");
  });

  it("normalizes URLs adding https://", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      facebook_url: "facebook.com/HogarNorte",
      instagram_url: "instagram.com/hogar_norte",
      tiktok_url: "https://tiktok.com/@hogarnorte",
    });
    expect(result.ok).toBe(true);
    expect(result.data.facebook_url).toBe("https://facebook.com/HogarNorte");
    expect(result.data.instagram_url).toBe("https://instagram.com/hogar_norte");
    expect(result.data.tiktok_url).toBe("https://tiktok.com/@hogarnorte");
  });

  it("rejects malformed URLs", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      facebook_url: "no es una url",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("facebook_url");
  });

  it("treats No encontrado as empty optional data", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      comuna: "No encontrado",
      telefono: "No encontrado",
      email: "No encontrado",
      facebook_url: "No encontrado",
      instagram_url: "No encontrado",
      tiktok_url: "No encontrado",
      cargo_contacto: "No encontrado",
      decision_maker_nombre: "No encontrado",
      software_actual: "No encontrado",
      dolor_principal: "No encontrado",
      notas: "No encontrado",
    });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      comuna: null,
      telefono: null,
      email: null,
      facebook_url: null,
      instagram_url: null,
      tiktok_url: null,
      cargo_contacto: null,
      decision_maker_nombre: null,
      software_actual: null,
      dolor_principal: null,
      notas: null,
    });
  });

  it("validates commercial qualification fields", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      digitalizacion_estado: "papel_excel_whatsapp",
      origen: "whatsapp",
      canal_preferido: "telefono",
      num_residentes: "42",
      fit_score: "88",
      probabilidad_cierre: "35",
      proxima_accion_fecha: "2026-06-01",
      dolor_principal: "Turnos y carpeta SEREMI en papel",
    });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      digitalizacion_estado: "papel_excel_whatsapp",
      origen: "whatsapp",
      canal_preferido: "telefono",
      num_residentes: 42,
      fit_score: 88,
      probabilidad_cierre: 35,
    });
  });

  it("requires lost reason when stage is perdido", () => {
    const result = validateProspectForm({
      ...PROSPECT_FORM_EMPTY,
      eleam_nombre: "Hogar Norte",
      estado: "perdido",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("motivo_perdida");
  });
});

describe("validateProspectListForm", () => {
  it("requires nombre", () => {
    const result = validateProspectListForm({ nombre: "", descripcion: "" });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("nombre");
  });

  it("accepts nombre y descripcion opcional", () => {
    const result = validateProspectListForm({ nombre: "Lista abril", descripcion: "Cohorte ABC" });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ nombre: "Lista abril", descripcion: "Cohorte ABC" });
  });
});

describe("validateCampaignForm", () => {
  it("requires nombre y asunto_default", () => {
    const result = validateCampaignForm({
      nombre: "",
      asunto_default: "",
      cuerpo_default: "",
      from_email: "",
      from_name: "",
      reply_to_email: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("nombre");
    expect(result.errors).toHaveProperty("asunto_default");
  });

  it("accepts campaign with only nombre y asunto_default", () => {
    const result = validateCampaignForm({
      nombre: "Test abril",
      asunto_default: "FichaEleam para {{eleam_nombre}}",
      cuerpo_default: "",
      mensaje_rrss_template: "",
      script_llamada_template: "",
      from_email: "",
      from_name: "",
      reply_to_email: "",
    });
    expect(result.ok).toBe(true);
    expect(result.data.nombre).toBe("Test abril");
    expect(result.data.from_email).toBeNull();
    expect(result.data.variables_usadas).toEqual(["eleam_nombre"]);
  });

  it("validates from_email format when present", () => {
    const result = validateCampaignForm({
      nombre: "x",
      asunto_default: "y",
      cuerpo_default: "",
      mensaje_rrss_template: "",
      script_llamada_template: "",
      from_email: "invalid",
      from_name: "",
      reply_to_email: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("from_email");
  });

  it("normalizes from_email to lowercase", () => {
    const result = validateCampaignForm({
      nombre: "Test",
      asunto_default: "Asunto",
      cuerpo_default: "Hola {{eleam_nombre}}",
      mensaje_rrss_template: "",
      script_llamada_template: "",
      from_email: "Gabriel@FICHAELEAM.cl",
      from_name: "Gabriel",
      reply_to_email: "Contacto@FichaEleam.cl",
    });
    expect(result.ok).toBe(true);
    expect(result.data.from_email).toBe("gabriel@fichaeleam.cl");
    expect(result.data.reply_to_email).toBe("contacto@fichaeleam.cl");
  });

  it("rejects unknown template variables", () => {
    const result = validateCampaignForm({
      nombre: "Test",
      asunto_default: "Hola {{variable_inventada}}",
      cuerpo_default: "",
      mensaje_rrss_template: "",
      script_llamada_template: "",
      from_email: "",
      from_name: "",
      reply_to_email: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("asunto_default");
  });
});
