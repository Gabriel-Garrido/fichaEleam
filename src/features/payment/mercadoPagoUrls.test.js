import { describe, expect, it } from "vitest";
import { isMercadoPagoCheckoutUrl } from "./mercadoPagoUrls";

describe("isMercadoPagoCheckoutUrl", () => {
  it("accepts MercadoPago country checkout domains", () => {
    expect(isMercadoPagoCheckoutUrl("https://www.mercadopago.com/checkout/v1/redirect?pref_id=1")).toBe(true);
    expect(isMercadoPagoCheckoutUrl("https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=1")).toBe(true);
    expect(isMercadoPagoCheckoutUrl("https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=1")).toBe(true);
    expect(isMercadoPagoCheckoutUrl("https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=1")).toBe(true);
  });

  it("rejects non-HTTPS URLs and lookalike domains", () => {
    expect(isMercadoPagoCheckoutUrl("http://www.mercadopago.cl/subscriptions/checkout")).toBe(false);
    expect(isMercadoPagoCheckoutUrl("https://mercadopago.com.evil.example/checkout")).toBe(false);
    expect(isMercadoPagoCheckoutUrl("https://evil-mercadopago.cl.example/checkout")).toBe(false);
    expect(isMercadoPagoCheckoutUrl("not-a-url")).toBe(false);
  });
});
