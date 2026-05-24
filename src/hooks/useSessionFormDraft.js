import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function readDraft(key, initialValue) {
  if (typeof sessionStorage === "undefined") return initialValue;
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? { ...initialValue, ...JSON.parse(stored) } : initialValue;
  } catch {
    return initialValue;
  }
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export default function useSessionFormDraft(key, initialValue) {
  const initialRef = useRef(initialValue);
  const keyRef = useRef(key);
  const initialSignature = useMemo(() => stableStringify(initialValue), [initialValue]);
  const [value, setValue] = useState(() => readDraft(key, initialValue));

  useEffect(() => {
    initialRef.current = initialValue;
    if (keyRef.current !== key) {
      keyRef.current = key;
      setValue(readDraft(key, initialValue));
    }
  }, [initialSignature, initialValue, key]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Draft persistence is a convenience only; form submission must keep working.
    }
  }, [key, value]);

  const resetDraft = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    }
    setValue(initialRef.current);
  }, [key]);

  const currentInitialSignature = stableStringify(initialRef.current);
  const isDirty = useMemo(
    () => stableStringify(value) !== currentInitialSignature,
    [currentInitialSignature, value]
  );

  return [value, setValue, resetDraft, isDirty];
}
