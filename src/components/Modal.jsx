import { useEffect, useId, useRef } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const INITIAL_FOCUSABLE = [
  "[data-autofocus]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled]):not([aria-label='Cerrar'])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const modalStack = [];
let bodyLockDepth = 0;
let previousBodyOverflow = "";

function getFocusable(panel) {
  return Array.from(panel?.querySelectorAll(FOCUSABLE) ?? [])
    .filter((node) => node.offsetParent !== null || node === document.activeElement);
}

function removeFromStack(id) {
  const index = modalStack.lastIndexOf(id);
  if (index >= 0) modalStack.splice(index, 1);
}

function lockBodyScroll() {
  if (bodyLockDepth === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockDepth += 1;
}

function unlockBodyScroll() {
  bodyLockDepth = Math.max(0, bodyLockDepth - 1);
  if (bodyLockDepth === 0) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = "";
  }
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  panelClassName = "",
  backdropClassName = "",
  showCloseButton = true,
  closeButtonClassName = "",
  labelledById,
  ariaLabel,
  closeOnBackdrop = false,
  closeOnEscape = true,
}) {
  const modalIdRef = useRef(Symbol("modal"));
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const modalId = modalIdRef.current;
    modalStack.push(modalId);
    triggerRef.current = document.activeElement;
    const panel = panelRef.current;

    lockBodyScroll();

    if (panel) {
      const first = panel.querySelector(INITIAL_FOCUSABLE);
      window.requestAnimationFrame(() => {
        (first ?? panel).focus({ preventScroll: true });
      });
    }

    const handleKey = (e) => {
      if (modalStack[modalStack.length - 1] !== modalId) return;

      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== "Tab") return;
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        panelRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      removeFromStack(modalId);
      unlockBodyScroll();
      if (triggerRef.current && document.contains(triggerRef.current)) {
        triggerRef.current.focus({ preventScroll: true });
      }
    };
  }, [closeOnEscape, isOpen]);

  if (!isOpen) return null;

  const panelClasses = panelClassName || "max-w-lg p-4 sm:p-6";
  const labelledBy = labelledById ?? (title ? titleId : undefined);
  const accessibleLabel = labelledBy ? undefined : (ariaLabel ?? "Diálogo");
  const backdropClasses = backdropClassName
    || "fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:p-4";
  const closeClasses = closeButtonClassName
    || "absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors";

  return (
    <div
      className={backdropClasses}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={accessibleLabel}
        tabIndex={-1}
        className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden ${panelClasses}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
            aria-label="Cerrar"
            className={closeClasses}
          >
            &times;
          </button>
        )}
        {title && (
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 mb-4 pr-8">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
