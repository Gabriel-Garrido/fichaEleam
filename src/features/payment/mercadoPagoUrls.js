const MP_CHECKOUT_HOSTS = [
  /^(.+\.)?mercadopago\.com$/i,
  /^(.+\.)?mercadopago\.cl$/i,
  /^(.+\.)?mercadopago\.com\.[a-z]{2}$/i,
];

export function isMercadoPagoCheckoutUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return MP_CHECKOUT_HOSTS.some((regex) => regex.test(url.hostname));
  } catch {
    return false;
  }
}
