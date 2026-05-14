import React, { useEffect } from "react";

function Modal({ isOpen, onClose, title, children, panelClassName = "" }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panelClasses = panelClassName || "max-w-lg p-4 sm:p-6";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Diálogo"}
        className={`relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto ${panelClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          &times;
        </button>
        {title && (
          <h2 className="text-lg font-semibold text-slate-900 mb-4 pr-8">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
