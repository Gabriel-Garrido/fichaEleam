import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const ICON_PATHS = {
  success: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  error: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  warning:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  info: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
};

const STYLES = {
  success: "bg-emerald-600",
  error: "bg-rose-600",
  warning: "bg-amber-500",
  info: "bg-sky-600",
};

let _toastCounter = 0;

function ToastIcon({ type }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[type] ?? ICON_PATHS.info} />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info", duration) => {
    const id = ++_toastCounter;
    const fallback = type === "error" ? 7000 : 4500;
    const ms = typeof duration === "number" ? duration : fallback;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal de toasts */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-24 right-4 lg:bottom-4 z-[60] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pb-[max(env(safe-area-inset-bottom),0rem)] lg:pb-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 ${STYLES[t.type] ?? STYLES.info} text-white rounded-xl px-4 py-3 shadow-lg animate-slide-in`}
          >
            <ToastIcon type={t.type} />
            <span className="flex-1 text-sm leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-white/70 hover:text-white ml-1 shrink-0"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
