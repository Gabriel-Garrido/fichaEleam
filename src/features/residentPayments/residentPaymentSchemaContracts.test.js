import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const schema = fs.readFileSync(path.join(root, "supabase_schema.sql"), "utf8");
const receiptFunction = fs.readFileSync(path.join(root, "supabase/functions/send-resident-payment-receipt/index.ts"), "utf8");

describe("resident payment security contracts", () => {
  it("mantiene la cobranza separada de pagos comerciales", () => {
    expect(schema).toContain("create table if not exists public.resident_payments");
    expect(schema).toContain("create table if not exists public.pagos");
    expect(schema).toContain("resident_payment_snapshot");
    expect(schema).not.toMatch(/insert into public\.pagos[\s\S]{0,300}resident_payments/i);
  });

  it("crea la clave candidata de residentes antes de las FK compuestas", () => {
    const uniqueKey = schema.indexOf("create unique index if not exists residentes_id_eleam_unique");
    const paymentContact = schema.indexOf("create table if not exists public.resident_payment_contacts");
    expect(uniqueKey).toBeGreaterThan(-1);
    expect(paymentContact).toBeGreaterThan(uniqueKey);
    expect(schema).toContain("on public.residentes(id, eleam_id)");
  });

  it("protege saldos, documentos y trazabilidad", () => {
    expect(schema).toContain("for update;");
    expect(schema).toContain("El monto supera el saldo pendiente");
    expect(schema).toContain("Completa o cancela los pagos pendientes");
    expect(schema).toContain("'pagos-residentes'");
    expect(schema).toContain("resident_payment_audit");
    expect(schema).toContain("storage_resident_payments_delete_pending");
    expect(schema).toContain("array_length(string_to_array(name, '/'), 1) = 3");
    expect(schema).not.toContain("grant execute on function public.adjuntar_documento_pago_residente");
    expect(schema).not.toMatch(/create policy[^;]+on public\.resident_payments\s+for delete/i);
  });

  it("identifica la confirmación como no tributaria y valida el archivo", () => {
    expect(receiptFunction).toContain("NO ES UN DOCUMENTO TRIBUTARIO");
    expect(receiptFunction).toContain("detectMime");
    expect(receiptFunction).toContain("MAX_DELIVERIES_PER_HOUR");
    expect(receiptFunction).toContain('body.action === "finalize"');
    expect(receiptFunction).toContain("attachments");
  });

  it("no recrea períodos anulados ni altera recurrencias con un cobro único", () => {
    expect(schema).toMatch(/resident_charges_month_unique[\s\S]{0,180}where tipo = 'mensualidad';/);
    expect(schema).toContain("p_tipo = 'mensualidad' and coalesce(p_repetir_mensual, false)");
    expect(schema).toContain("interval '23 months'");
  });
});
