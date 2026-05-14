export async function throwEdgeFunctionError(error, fallbackMessage) {
  let message = fallbackMessage;
  let code = "edge_function_error";

  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      message = body?.error || body?.message || body?.detail || message;
      code = body?.code || code;
    } catch {
      message = error?.message || message;
    }
  } else {
    message = error?.message || message;
  }

  const normalized = new Error(message);
  normalized.code = code;
  throw normalized;
}
