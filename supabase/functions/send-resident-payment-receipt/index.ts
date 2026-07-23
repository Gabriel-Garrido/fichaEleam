import { PDFDocument, StandardFonts, rgb, type PDFFont } from "npm:pdf-lib@1.17.1";
import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";

const BUCKET = "pagos-residentes";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DELIVERY_COOLDOWN_MS = 30_000;
const MAX_DELIVERIES_PER_HOUR = 10;
const DOCUMENT_TYPES = new Set(["boleta", "factura", "comprobante_pago", "otro"]);

function cleanText(value: unknown, max = 500): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function safeFilename(value: unknown): string {
  return cleanText(value, 180)
    .replace(/\.\./g, "_")
    .replace(/[/\\]/g, "_")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/^\.+/, "_")
    || "documento_pago";
}

function eleamHasAccess(eleam: Record<string, any> | null): boolean {
  if (!eleam) return false;
  if (eleam.pago_activo || ["activo", "en_gracia"].includes(eleam.subscription_status)) return true;
  const stillValid = eleam.fecha_vencimiento_suscripcion
    && new Date(eleam.fecha_vencimiento_suscripcion).getTime() > Date.now();
  return Boolean(stillValid && (
    eleam.subscription_status === "cancelado"
    || (eleam.plan === "demo" && eleam.subscription_status === "pendiente")
  ));
}

function pdfText(value: unknown, max = 500): string {
  return cleanText(value, max).replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "?");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += size) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + size));
  }
  return btoa(binary);
}

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length > 4 && new TextDecoder().decode(bytes.subarray(0, 4)) === "%PDF") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  return null;
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number, maxLines = 3): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}...`;
  }
  return lines.length ? lines : ["—"];
}

function formatClp(value: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(`${value}T12:00:00-04:00`));
}

async function buildReceipt(payment: Record<string, any>, eleamName: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([595.28, 841.89]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const charge = payment.charge;
  const resident = payment.resident;
  const fields = [
    ["ELEAM", eleamName],
    ["Residente", `${resident.nombre} ${resident.apellido}`],
    ["Concepto", charge.concepto],
    ["Monto recibido", formatClp(payment.monto)],
    ["Fecha de pago", formatDate(payment.fecha_pago)],
    ["Medio de pago", payment.metodo_pago],
    ["Referencia", payment.referencia || "Sin referencia"],
    ["Observación", payment.observacion || "Sin observación"],
    ["Identificador", payment.id],
  ];

  page.drawRectangle({ x: 0, y: 742, width: 595.28, height: 100, color: rgb(0.06, 0.46, 0.43) });
  page.drawText("FichaEleam", { x: 48, y: 795, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Confirmación de pago registrada", { x: 48, y: 765, size: 16, font: regular, color: rgb(0.86, 0.98, 0.96) });
  page.drawText("NO ES UN DOCUMENTO TRIBUTARIO", { x: 48, y: 708, size: 12, font: bold, color: rgb(0.75, 0.15, 0.15) });
  page.drawText("Esta confirmación respalda un registro administrativo del ELEAM.", { x: 48, y: 687, size: 10, font: regular, color: rgb(0.34, 0.38, 0.44) });

  let y = 640;
  for (const [label, rawValue] of fields) {
    const lines = wrapText(pdfText(rawValue, 180), regular, 10, 365);
    page.drawText(pdfText(label), { x: 48, y, size: 9, font: bold, color: rgb(0.39, 0.45, 0.53) });
    lines.forEach((line, index) => page.drawText(line, { x: 175, y: y - (index * 13), size: 10, font: regular, color: rgb(0.10, 0.14, 0.20) }));
    y -= Math.max(38, 15 + (lines.length * 13));
  }
  page.drawLine({ start: { x: 48, y: 198 }, end: { x: 547, y: 198 }, thickness: 1, color: rgb(0.88, 0.90, 0.93) });
  page.drawText("El documento tributario o respaldo externo se adjunta por separado a este correo.", { x: 48, y: 175, size: 9, font: regular, color: rgb(0.39, 0.45, 0.53) });
  page.drawText(pdfText(`Generado el ${new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date())}`), { x: 48, y: 72, size: 8, font: regular, color: rgb(0.58, 0.64, 0.72) });
  return document.save();
}

async function loadStoredDocument(sb: ReturnType<typeof adminClient>, path: string) {
  const { data: stored, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !stored) return { error: "No se pudo recuperar el documento adjunto" } as const;
  const bytes = new Uint8Array(await stored.arrayBuffer());
  const mime = detectMime(bytes);
  if (bytes.length === 0 || bytes.length > MAX_FILE_SIZE || !mime) {
    return { error: "El documento adjunto no tiene un formato PDF, JPG o PNG válido" } as const;
  }
  return { bytes, mime } as const;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse(req, { error: "Método no permitido" }, 405);

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) return jsonResponse(req, { error: "No autenticado" }, 401);
    if (!profile.eleam_id || !["admin_eleam", "funcionario"].includes(profile.rol)) {
      return jsonResponse(req, { error: "Este módulo pertenece a la administración del ELEAM" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const paymentId = cleanText(body.paymentId, 36);
    const finalize = body.action === "finalize";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      return jsonResponse(req, { error: "Pago inválido" }, 400);
    }

    const sb = adminClient();
    const [{ data: eleam }, { data: permissions }, { data: areaPermission }] = await Promise.all([
      sb.from("eleams").select("id, nombre, plan, pago_activo, subscription_status, fecha_vencimiento_suscripcion").eq("id", profile.eleam_id).maybeSingle(),
      profile.rol === "funcionario"
        ? sb.from("funcionario_permisos").select("ver_pagos_residentes, registrar_pagos_residentes, enviar_comprobantes_pagos").eq("profile_id", user.id).maybeSingle()
        : Promise.resolve({ data: { ver_pagos_residentes: true, registrar_pagos_residentes: true, enviar_comprobantes_pagos: true } }),
      profile.rol === "funcionario"
        ? sb.from("profile_feature_permissions").select("enabled").eq("profile_id", user.id).eq("feature_id", "resident_payments").maybeSingle()
        : Promise.resolve({ data: { enabled: true } }),
    ]);
    if (!eleam || !eleamHasAccess(eleam)) {
      return jsonResponse(req, { error: "El ELEAM no tiene acceso activo" }, 403);
    }
    if (!permissions?.ver_pagos_residentes || areaPermission?.enabled !== true) {
      return jsonResponse(req, { error: "No tienes acceso a cobranza" }, 403);
    }
    if (finalize && !permissions?.registrar_pagos_residentes) {
      return jsonResponse(req, { error: "No tienes permiso para registrar pagos" }, 403);
    }
    if (!finalize && !permissions?.enviar_comprobantes_pagos) {
      return jsonResponse(req, { error: "No tienes permiso para enviar comprobantes" }, 403);
    }

    const { data: rawPayment, error: paymentError } = await sb
      .from("resident_payments")
      .select("id, eleam_id, residente_id, monto, fecha_pago, metodo_pago, referencia, observacion, estado, documento_path, documento_nombre, documento_mime, documento_tamano, registrado_por, charge:resident_charges!inner(concepto, tipo, periodo), resident:residentes!inner(nombre, apellido)")
      .eq("id", paymentId)
      .eq("eleam_id", profile.eleam_id)
      .maybeSingle();
    if (paymentError || !rawPayment) return jsonResponse(req, { error: "Pago no encontrado" }, 404);

    let payment = rawPayment;
    let documentPath = payment.documento_path;
    let documentName = payment.documento_nombre;
    let documentMime = payment.documento_mime;
    let externalBytes: Uint8Array;

    if (finalize) {
      const documentType = cleanText(body.documentType, 30);
      documentPath = cleanText(body.documentPath, 500);
      documentName = safeFilename(body.documentName);
      const expectedPrefix = `${profile.eleam_id}/${payment.id}/`;
      if (!DOCUMENT_TYPES.has(documentType) || !documentName || !documentPath.startsWith(expectedPrefix)
          || documentPath.slice(expectedPrefix.length).includes("/")) {
        return jsonResponse(req, { error: "Los datos del documento no son válidos" }, 422);
      }
      if (payment.registrado_por !== user.id) {
        return jsonResponse(req, { error: "Solo quien inició el registro puede completar este pago" }, 403);
      }
      if (payment.estado === "registrado" && payment.documento_path !== documentPath) {
        return jsonResponse(req, { error: "Este pago ya tiene otro documento asociado" }, 409);
      }
      if (!["pendiente_documento", "registrado"].includes(payment.estado)) {
        return jsonResponse(req, { error: "El pago ya no se puede completar" }, 409);
      }

      const loaded = await loadStoredDocument(sb, documentPath);
      if ("error" in loaded) return jsonResponse(req, { error: loaded.error }, 422);
      externalBytes = loaded.bytes;
      documentMime = loaded.mime;

      if (payment.estado === "pendiente_documento") {
        const { data: finalized, error: finalizeError } = await sb.from("resident_payments").update({
          estado: "registrado",
          documento_tipo: documentType,
          documento_path: documentPath,
          documento_nombre: documentName,
          documento_mime: documentMime,
          documento_tamano: externalBytes.length,
          actualizado_en: new Date().toISOString(),
        }).eq("id", payment.id).eq("eleam_id", profile.eleam_id).eq("estado", "pendiente_documento").eq("registrado_por", user.id).select().maybeSingle();
        if (finalizeError || !finalized) return jsonResponse(req, { error: "El pago cambió mientras se adjuntaba el documento" }, 409);
        payment = { ...payment, ...finalized };
        await sb.from("resident_payment_audit").insert({
          eleam_id: profile.eleam_id,
          entidad: "pago",
          entidad_id: payment.id,
          accion: "adjuntar",
          detalle: { archivo: documentName, mime: documentMime, tamano: externalBytes.length },
          realizado_por: user.id,
        });
      } else {
        const { data: previous } = await sb.from("resident_payment_deliveries")
          .select("id, estado, enviado_en, error, creado_en")
          .eq("payment_id", payment.id).order("creado_en", { ascending: false }).limit(1).maybeSingle();
        if (previous) return jsonResponse(req, { registered: true, sent: previous.estado === "enviado", delivery: previous, idempotent: true });
      }
    } else {
      if (payment.estado !== "registrado" || !documentPath || !documentName) {
        return jsonResponse(req, { error: "Pago registrado no encontrado" }, 404);
      }
      const loaded = await loadStoredDocument(sb, documentPath);
      if ("error" in loaded) return jsonResponse(req, { error: loaded.error }, 422);
      externalBytes = loaded.bytes;
      documentMime = loaded.mime;
    }

    if (!permissions?.enviar_comprobantes_pagos) {
      return jsonResponse(req, { registered: true, sent: false, emailSkipped: true });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ data: latestDelivery }, { count: recentCount }] = await Promise.all([
      sb.from("resident_payment_deliveries").select("creado_en").eq("payment_id", payment.id).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
      sb.from("resident_payment_deliveries").select("id", { count: "exact", head: true }).eq("payment_id", payment.id).gte("creado_en", oneHourAgo),
    ]);
    if (latestDelivery?.creado_en && Date.now() - new Date(latestDelivery.creado_en).getTime() < DELIVERY_COOLDOWN_MS) {
      return jsonResponse(req, { error: "Espera unos segundos antes de volver a enviar" }, 429);
    }
    if ((recentCount ?? 0) >= MAX_DELIVERIES_PER_HOUR) {
      return jsonResponse(req, { error: "Se alcanzó el límite temporal de envíos para este pago" }, 429);
    }

    const resident = Array.isArray(payment.resident) ? payment.resident[0] : payment.resident;
    const charge = Array.isArray(payment.charge) ? payment.charge[0] : payment.charge;
    if (!resident || !charge) return jsonResponse(req, { error: "El pago no tiene un cobro o residente válido" }, 422);
    const paymentRecord = { ...payment, resident, charge };

    const { data: contact } = await sb.from("resident_payment_contacts")
      .select("nombre, email, relacion")
      .eq("residente_id", payment.residente_id)
      .eq("eleam_id", profile.eleam_id)
      .maybeSingle();
    if (!contact?.email) return jsonResponse(req, { error: "El residente no tiene un contacto de pagos" }, 409);

    const receiptBytes = await buildReceipt(paymentRecord, eleam.nombre);
    const residentName = cleanText(`${resident.nombre} ${resident.apellido}`, 160);
    const emailResult = await sendEmail({
      to: contact.email,
      subject: cleanText(`Comprobante de pago · ${residentName} · ${eleam.nombre}`, 180),
      html: `<!doctype html><html lang="es"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b"><div style="max-width:580px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#0f766e;padding:24px 32px;color:white"><h1 style="margin:0;font-size:21px">${escapeHtml(eleam.nombre)}</h1><p style="margin:6px 0 0;color:#ccfbf1">Confirmación de pago</p></div><div style="padding:28px 32px"><p>Hola, <strong>${escapeHtml(contact.nombre)}</strong>.</p><p>Registramos un pago asociado a <strong>${escapeHtml(residentName)}</strong>.</p><div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:16px;margin:20px 0"><p style="margin:0 0 8px"><strong>${formatClp(payment.monto)}</strong></p><p style="margin:0;font-size:14px">${escapeHtml(charge.concepto)} · ${formatDate(payment.fecha_pago)}</p></div><p style="font-size:14px;color:#475569">Adjuntamos la confirmación emitida por FichaEleam y el documento externo cargado por el establecimiento.</p><p style="font-size:12px;color:#b91c1c"><strong>La confirmación de FichaEleam no es una boleta, factura ni documento tributario.</strong></p><p style="font-size:12px;color:#64748b;margin-top:24px">Si tienes dudas sobre este pago, comunícate con el establecimiento por sus canales habituales.</p></div></div></body></html>`,
      attachments: [
        { filename: `confirmacion_pago_${payment.id.slice(0, 8)}.pdf`, content: bytesToBase64(receiptBytes) },
        { filename: documentName, content: bytesToBase64(externalBytes) },
      ],
    });

    const delivery = {
      eleam_id: profile.eleam_id,
      payment_id: payment.id,
      destinatario_nombre: contact.nombre,
      destinatario_email: contact.email,
      estado: emailResult.sent ? "enviado" : "fallido",
      proveedor_id: emailResult.providerMessageId ?? null,
      error: emailResult.sent ? null : cleanText(emailResult.error || "Envío no confirmado", 1000),
      solicitado_por: user.id,
      enviado_en: emailResult.sent ? new Date().toISOString() : null,
    };
    const { data: savedDelivery, error: deliveryError } = await sb.from("resident_payment_deliveries").insert(delivery).select("id, estado, enviado_en, error").single();
    if (deliveryError) console.error("No se pudo guardar la trazabilidad del envío", deliveryError);
    await sb.from("resident_payment_audit").insert({
      eleam_id: profile.eleam_id,
      entidad: "envio",
      entidad_id: savedDelivery?.id ?? payment.id,
      accion: finalize ? "enviar" : "reintentar",
      detalle: { payment_id: payment.id, estado: delivery.estado, delivery_saved: !deliveryError },
      realizado_por: user.id,
    });

    if (!emailResult.sent) {
      const payload = { registered: true, sent: false, error: "El pago quedó registrado, pero el correo no pudo enviarse", delivery: savedDelivery };
      return finalize ? jsonResponse(req, payload) : jsonResponse(req, payload, 502);
    }
    return jsonResponse(req, { registered: true, sent: true, delivery: savedDelivery });
  } catch (error) {
    console.error("send resident payment receipt", error);
    return jsonResponse(req, { error: "No se pudo completar el comprobante" }, 500);
  }
});
