import { supabase } from "../../services/supabaseConfig";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";
import { validatePaymentFile } from "./residentPaymentUtils";

const BUCKET = "pagos-residentes";

function rpcError(error, fallback) {
  if (!error) return null;
  const message = String(error.message || "");
  if (message.includes("duplicate") || error.code === "23505") return new Error("Ya existe una mensualidad para ese residente y período.");
  if (message.includes("saldo pendiente")) return new Error("El monto supera el saldo pendiente del cobro.");
  if (message.includes("pagos pendientes")) return new Error("Completa o cancela los pagos incompletos antes de iniciar otro.");
  return new Error(fallback);
}

function safeFilename(name) {
  const cleaned = String(name || "documento")
    .replace(/\.\./g, "_")
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 120);
  return cleaned || "documento";
}

export async function getResidentPaymentSnapshot() {
  const { data, error } = await supabase.rpc("resident_payment_snapshot");
  if (error) throw rpcError(error, "No se pudo cargar la cobranza.");
  return {
    eleamId: data?.eleamId ?? null,
    residents: data?.residents ?? [],
    contacts: data?.contacts ?? [],
    billingProfiles: data?.billingProfiles ?? [],
    charges: data?.charges ?? [],
    payments: data?.payments ?? [],
    deliveries: data?.deliveries ?? [],
    reminders: data?.reminders ?? [],
  };
}

export async function savePaymentContact(residentId, contact) {
  const { data, error } = await supabase.rpc("guardar_contacto_pago_residente", {
    p_residente_id: residentId,
    p_nombre: contact.nombre.trim(),
    p_relacion: contact.relacion.trim(),
    p_email: contact.email.trim().toLowerCase(),
    p_telefono: contact.telefono?.trim() || null,
  });
  if (error) throw rpcError(error, "No se pudo guardar el contacto de pagos.");
  return data;
}

export async function updateResidentBillingProfile(profile, changes = {}) {
  const next = { ...profile, ...changes };
  const { data, error } = await supabase.rpc("actualizar_mensualidad_residente", {
    p_residente_id: next.residente_id,
    p_monto_mensual: Number(next.monto_mensual),
    p_dia_vencimiento: Number(next.dia_vencimiento),
    p_concepto: next.concepto,
    p_mes_inicio: next.mes_inicio,
    p_activo: next.activo,
  });
  if (error) throw rpcError(error, "No se pudo actualizar la mensualidad automática.");
  return data;
}

export async function deleteResidentBillingProfile(residentId) {
  const { error } = await supabase.rpc("eliminar_mensualidad_residente", {
    p_residente_id: residentId,
  });
  if (error) throw rpcError(error, "No se pudo eliminar la mensualidad.");
}

export async function createResidentCharge(payload) {
  const { data, error } = await supabase.rpc("crear_cobro_residente", {
    p_residente_id: payload.residenteId,
    p_tipo: payload.tipo,
    p_concepto: payload.concepto.trim(),
    p_periodo: payload.tipo === "mensualidad" ? `${payload.periodo}-01` : null,
    p_fecha_vencimiento: payload.fechaVencimiento,
    p_monto: Number(payload.monto),
    p_observacion: payload.observacion?.trim() || null,
    p_repetir_mensual: payload.tipo === "mensualidad" && payload.repetirMensual === true,
  });
  if (error) throw rpcError(error, "No se pudo crear el cobro.");
  return data;
}

export async function registerResidentPayment({ eleamId, chargeId, amount, date, method, reference, observation, documentType, file }) {
  const fileError = validatePaymentFile(file);
  if (fileError) throw new Error(fileError);
  const { data: pending, error: beginError } = await supabase.rpc("iniciar_pago_residente", {
    p_charge_id: chargeId,
    p_monto: Number(amount),
    p_fecha_pago: date,
    p_metodo_pago: method,
    p_referencia: reference?.trim() || null,
    p_observacion: observation?.trim() || null,
  });
  if (beginError) throw rpcError(beginError, "No se pudo iniciar el registro del pago.");

  const path = `${eleamId}/${pending.id}/${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    await supabase.rpc("anular_pago_residente", {
      p_payment_id: pending.id,
      p_motivo: "Anulación automática del sistema: no fue posible cargar el documento adjunto.",
    });
    throw new Error("No se pudo adjuntar el documento. El pago no fue registrado.");
  }

  try {
    const { data, error } = await supabase.functions.invoke("send-resident-payment-receipt", {
      body: {
        action: "finalize",
        paymentId: pending.id,
        documentType,
        documentPath: path,
        documentName: file.name,
      },
    });
    if (error) await throwEdgeFunctionError(error, "No se pudo validar el documento del pago.");
    return {
      payment: { ...pending, estado: "registrado", documento_path: path, documento_nombre: file.name },
      emailSent: data?.sent === true,
      emailSkipped: data?.emailSkipped === true,
    };
  } catch (finalizeError) {
    // Una respuesta de red puede perderse después de que el servidor haya
    // confirmado el pago. Consultar antes de limpiar evita anular un registro
    // válido o duplicar el abono al reintentar.
    const { data: recovered } = await supabase.from("resident_payments")
      .select("*").eq("id", pending.id).maybeSingle();
    if (recovered?.estado === "registrado") {
      const { data: delivery } = await supabase.from("resident_payment_deliveries")
        .select("estado").eq("payment_id", pending.id)
        .order("creado_en", { ascending: false }).limit(1).maybeSingle();
      return { payment: recovered, emailSent: delivery?.estado === "enviado", emailSkipped: false };
    }
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.rpc("anular_pago_residente", {
      p_payment_id: pending.id,
      p_motivo: "Anulación automática del sistema: el documento adjunto no pudo validarse.",
    });
    throw finalizeError;
  }
}

export async function resendResidentPaymentReceipt(paymentId) {
  const { data, error } = await supabase.functions.invoke("send-resident-payment-receipt", { body: { paymentId, retry: true } });
  if (error) await throwEdgeFunctionError(error, "No se pudo enviar el comprobante. Intenta nuevamente.");
  if (!data?.sent) throw new Error(data?.error || "No se pudo enviar el comprobante. Intenta nuevamente.");
  return data;
}

export async function sendResidentPaymentReminder(residentId) {
  const { data, error } = await supabase.functions.invoke("send-resident-payment-receipt", {
    body: { action: "reminder", residentId },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo enviar el recordatorio.");
  if (!data?.sent) throw new Error(data?.error || "No se pudo enviar el recordatorio.");
  return data;
}

export async function getResidentPaymentDocumentUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) throw new Error("No se pudo abrir el documento.");
  return data.signedUrl;
}

export async function voidResidentPayment(paymentId, reason) {
  const { data, error } = await supabase.rpc("anular_pago_residente", { p_payment_id: paymentId, p_motivo: reason.trim() });
  if (error) throw rpcError(error, "No se pudo anular el pago.");
  return data;
}

export async function voidResidentCharge(chargeId, reason) {
  const { data, error } = await supabase.rpc("anular_cobro_residente", { p_charge_id: chargeId, p_motivo: reason.trim() });
  if (error) throw rpcError(error, "No se pudo anular el cobro.");
  return data;
}
