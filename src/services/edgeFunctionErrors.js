export async function throwEdgeFunctionError(error, fallbackMessage) {
  let message = fallbackMessage;

  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      message = body?.error || body?.message || body?.detail || message;
    } catch {
      message = error?.message || message;
    }
  } else {
    message = error?.message || message;
  }

  throw new Error(message);
}
