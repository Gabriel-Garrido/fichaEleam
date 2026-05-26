import { useEffect, useState } from "react";

/**
 * Programa `callback` para ejecutarse tras `delay` ms y devuelve una
 * función para cancelar la ejecución. Si `delay <= 0`, ejecuta de
 * inmediato y devuelve un noop. Función pura — se extrae del hook
 * para poder testear el debounce sin renderizar React.
 */
export function scheduleDebounce(callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback debe ser función");
  if (delay <= 0) {
    callback();
    return () => {};
  }
  const handle = setTimeout(callback, delay);
  return () => clearTimeout(handle);
}

/**
 * Devuelve `value` con un retraso de `delay` ms desde el último cambio.
 * Útil para search inputs que disparan queries server-side.
 *  - delay = 0: sin debounce (síncrono).
 *  - Cancela el timer pendiente si el valor cambia o el componente se desmonta.
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => scheduleDebounce(() => setDebounced(value), delay), [value, delay]);
  return debounced;
}
