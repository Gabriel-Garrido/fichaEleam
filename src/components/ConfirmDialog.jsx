import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "./Modal";

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: "¿Confirmar acción?",
  message: "",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  danger: false,
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ ...DEFAULTS, ...options });
    });
  }, []);

  const finish = (value) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolver?.(value);
  };

  const open = state !== null;
  const tone = state?.danger
    ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300"
    : "bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-300";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={open} onClose={() => finish(false)} title={state?.title} panelClassName="max-w-md p-5 sm:p-6">
        {state?.message && (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {state.message}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {state?.cancelText ?? DEFAULTS.cancelText}
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            autoFocus
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 ${tone}`}
          >
            {state?.confirmText ?? DEFAULTS.confirmText}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}
