import { formatDateOnly } from "../../utils/dateUtils";

// pdf-lib pesa ~300 kB gzip: se carga bajo demanda solo al generar el PDF,
// para que no entre en el bundle inicial ni en el chunk de la ficha.
let pdfLibPromise = null;
function loadPdfLib() {
  // Si la descarga falla (red), se limpia para que el próximo intento reintente.
  pdfLibPromise ??= import("pdf-lib").catch((error) => {
    pdfLibPromise = null;
    throw error;
  });
  return pdfLibPromise;
}

// Precarga el chunk al abrir el modal: la firma tarda más que la descarga,
// así el "Guardar" no paga la espera de la primera carga.
export function preloadConsentPdf() {
  loadPdfLib().catch(() => {});
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1];
  if (!base64) return null;
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function drawWrappedText(page, text, { x, y, size, font, color, maxWidth, lineHeight }) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) page.drawText(line, { x, y: currentY, size, font, color });
  return currentY - lineHeight;
}

export async function generateConsentPdf({ resident, eleam, consent, signatureDataUrl }) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.08, 0.12, 0.18);
  const muted = rgb(0.35, 0.42, 0.5);
  const teal = rgb(0.03, 0.45, 0.42);
  const body = rgb(0.15, 0.2, 0.28);

  page.drawText("Consentimiento voluntario de ingreso", { x: 48, y: 780, size: 18, font: bold, color: dark });
  page.drawText("Decreto N°20 MINSAL · FichaEleam", { x: 48, y: 756, size: 10, font: regular, color: teal });
  page.drawText(eleam?.nombre || "ELEAM", { x: 48, y: 734, size: 12, font: bold, color: dark });

  const rows = [
    ["Residente", `${resident?.nombre ?? ""} ${resident?.apellido ?? ""}`.trim()],
    ["RUT residente", resident?.rut || "No registrado"],
    ["Fecha de ingreso", formatDateOnly(resident?.fecha_ingreso)],
    ["Fecha consentimiento", formatDateOnly(consent.fecha_consentimiento)],
    ["Firmante", consent.firmante_nombre],
    ["RUT firmante", consent.firmante_rut || "No registrado"],
    ["Tipo firmante", consent.firmante_tipo],
    ["Relación", consent.relacion_residente || "No aplica"],
  ];

  let y = 700;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 48, y, size: 9, font: bold, color: muted });
    page.drawText(String(value || "—"), { x: 180, y, size: 10, font: regular, color: dark });
    y -= 22;
  }

  y -= 10;
  y = drawWrappedText(page, "El firmante declara que el ingreso al establecimiento se realiza de forma voluntaria y que recibió información comprensible sobre derechos, deberes y reglamento interno del ELEAM.", {
    x: 48, y, size: 10, font: regular, color: body, maxWidth: 500, lineHeight: 15,
  });

  const checks = [
    "Acepta ingreso voluntario",
    "Recibió derechos y deberes",
    "Recibió reglamento interno",
  ];
  y -= 10;
  for (const item of checks) {
    page.drawRectangle({ x: 50, y: y - 1, width: 10, height: 10, borderColor: teal, borderWidth: 1 });
    page.drawText("X", { x: 52, y, size: 8, font: bold, color: teal });
    page.drawText(item, { x: 68, y, size: 10, font: regular, color: dark });
    y -= 18;
  }

  if (consent.observaciones) {
    y -= 8;
    page.drawText("Observaciones", { x: 48, y, size: 10, font: bold, color: dark });
    y -= 16;
    y = drawWrappedText(page, consent.observaciones, {
      x: 48, y, size: 9, font: regular, color: body, maxWidth: 500, lineHeight: 13,
    });
  }

  const signatureBytes = dataUrlToBytes(signatureDataUrl);
  if (signatureBytes) {
    try {
      const signature = await pdf.embedPng(signatureBytes);
      const dims = signature.scale(0.32);
      page.drawText("Firma", { x: 48, y: 190, size: 10, font: bold, color: dark });
      page.drawImage(signature, { x: 48, y: 100, width: Math.min(dims.width, 260), height: Math.min(dims.height, 80) });
      page.drawLine({ start: { x: 48, y: 92 }, end: { x: 310, y: 92 }, thickness: 0.8, color: muted });
    } catch {
      page.drawText("Firma registrada digitalmente", { x: 48, y: 140, size: 10, font: regular, color: dark });
    }
  }

  page.drawText("Documento generado por FichaEleam. Debe conservarse en la carpeta personal del residente.", {
    x: 48, y: 48, size: 8, font: regular, color: muted,
  });

  return new Blob([await pdf.save()], { type: "application/pdf" });
}
