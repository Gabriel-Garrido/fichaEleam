import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  isWhatsAppLead,
  normalizeWhatsAppLeadForm,
  validateWhatsAppLeadForm,
  WHATSAPP_CARGO_TAG,
  WHATSAPP_PHONE,
  WHATSAPP_UTM_MEDIUM,
  WHATSAPP_UTM_SOURCE,
} from "./whatsAppLeadUtils";

describe("validateWhatsAppLeadForm", () => {
  it("requiere nombre, eleam, email y teléfono válidos", () => {
    expect(validateWhatsAppLeadForm({})).toEqual({
      nombre: "Requerido",
      eleam_nombre: "Requerido",
      email: "Email no válido",
      telefono: "Ingresa un teléfono válido",
    });
  });

  it("acepta un formulario válido", () => {
    expect(
      validateWhatsAppLeadForm({
        nombre: "Ana",
        eleam_nombre: "Residencia",
        email: "ana@residencia.cl",
        telefono: "+56912345678",
      }),
    ).toEqual({});
  });

  it("rechaza emails malformados", () => {
    expect(
      validateWhatsAppLeadForm({
        nombre: "Ana",
        eleam_nombre: "Residencia",
        email: "no-email",
        telefono: "+56912345678",
      }).email,
    ).toBe("Email no válido");
  });

  it("rechaza teléfonos demasiado cortos", () => {
    expect(
      validateWhatsAppLeadForm({
        nombre: "Ana",
        eleam_nombre: "Residencia",
        email: "ana@residencia.cl",
        telefono: "123",
      }).telefono,
    ).toBe("Ingresa un teléfono válido");
  });
});

describe("normalizeWhatsAppLeadForm", () => {
  it("normaliza email (lowercase + trim) y teléfono", () => {
    const payload = normalizeWhatsAppLeadForm(
      {
        nombre: " Ana ",
        eleam_nombre: " Residencia ",
        email: "  ANA@Residencia.cl ",
        telefono: " +56  912345678 ",
      },
      { pagina_origen: "/", referrer: "https://google.com" },
    );

    expect(payload.p_email).toBe("ana@residencia.cl");
    expect(payload.p_telefono).toBe("+56 912345678");
    expect(payload.p_nombre).toBe("Ana");
    expect(payload.p_eleam_nombre).toBe("Residencia");
  });

  it("marca el lead con cargo y UTM de WhatsApp", () => {
    const payload = normalizeWhatsAppLeadForm({
      nombre: "Ana",
      eleam_nombre: "Residencia",
      email: "ana@residencia.cl",
      telefono: "+56912345678",
    });
    expect(payload.p_cargo).toBe(WHATSAPP_CARGO_TAG);
    expect(payload.p_utm_source).toBe(WHATSAPP_UTM_SOURCE);
    expect(payload.p_utm_medium).toBe(WHATSAPP_UTM_MEDIUM);
    expect(payload.p_num_residentes).toBeNull();
  });

  it("preserva utm_campaign del contexto cuando viene", () => {
    const payload = normalizeWhatsAppLeadForm(
      { nombre: "Ana", eleam_nombre: "R", email: "a@b.cl", telefono: "+56912345678" },
      { utm_campaign: "lanzamiento_2026", utm_medium: "qr_flyer" },
    );
    expect(payload.p_utm_campaign).toBe("lanzamiento_2026");
    expect(payload.p_utm_medium).toBe("qr_flyer");
  });
});

describe("buildWhatsAppMessage", () => {
  it("construye un mensaje legible con datos completos", () => {
    const msg = buildWhatsAppMessage({
      nombre: "Ana",
      eleam_nombre: "Residencia Los Arrayanes",
      email: "ana@residencia.cl",
      telefono: "+56912345678",
    });
    expect(msg).toContain("Hola, soy Ana de Residencia Los Arrayanes");
    expect(msg).toContain("Me gustaría conocer más sobre FichaEleam.");
    expect(msg).toContain("- Correo: ana@residencia.cl");
    expect(msg).toContain("- Teléfono: +56912345678");
  });

  it("usa intent específico para source 'institutional'", () => {
    const msg = buildWhatsAppMessage(
      { nombre: "Ana", eleam_nombre: "R" },
      "institutional",
    );
    expect(msg).toContain("más de 35 residentes");
    expect(msg).toContain("cotización personalizada");
    expect(msg).not.toContain("Me gustaría conocer más sobre FichaEleam.");
  });

  it("usa intent específico para source 'pricing'", () => {
    const msg = buildWhatsAppMessage(
      { nombre: "Ana", eleam_nombre: "R" },
      "pricing",
    );
    expect(msg).toContain("información sobre los planes");
  });

  it("omite líneas vacías de email/teléfono ausentes", () => {
    const msg = buildWhatsAppMessage({ nombre: "Ana", eleam_nombre: "R" });
    expect(msg).not.toContain("- Correo:");
    expect(msg).not.toContain("- Teléfono:");
  });
});

describe("buildWhatsAppUrl", () => {
  it("genera URL wa.me con teléfono normalizado y mensaje codificado", () => {
    const url = buildWhatsAppUrl({
      nombre: "Ana",
      eleam_nombre: "R",
      email: "ana@r.cl",
      telefono: "+56912345678",
    });
    expect(url.startsWith(`https://wa.me/${WHATSAPP_PHONE}?text=`)).toBe(true);
    expect(url).toContain(encodeURIComponent("Hola, soy Ana"));
  });

  it("limpia caracteres no numéricos del teléfono destino", () => {
    const url = buildWhatsAppUrl({}, "+56 9 5118-7764");
    expect(url.startsWith("https://wa.me/56951187764?")).toBe(true);
  });

  it("propaga source al mensaje codificado", () => {
    const url = buildWhatsAppUrl(
      { nombre: "Ana", eleam_nombre: "R" },
      WHATSAPP_PHONE,
      "institutional",
    );
    expect(url).toContain(encodeURIComponent("más de 35 residentes"));
  });
});

describe("isWhatsAppLead", () => {
  it("identifica leads con utm_source whatsapp", () => {
    expect(isWhatsAppLead({ utm_source: "whatsapp" })).toBe(true);
  });

  it("identifica leads con cargo Contacto WhatsApp", () => {
    expect(isWhatsAppLead({ cargo: "Contacto WhatsApp" })).toBe(true);
  });

  it("descarta leads sin marcadores", () => {
    expect(isWhatsAppLead({ utm_source: "google", cargo: "Director/a" })).toBe(false);
    expect(isWhatsAppLead({})).toBe(false);
  });
});
