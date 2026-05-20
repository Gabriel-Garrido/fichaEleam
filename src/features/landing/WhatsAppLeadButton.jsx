import React, { useEffect, useRef, useState } from "react";
import { trackEvent } from "./landingAnalytics";

function WhatsAppIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const SHOW_CALLOUT_AFTER_MS = 6000;
const HIDE_CALLOUT_AFTER_MS = 8000;
const CALLOUT_DISMISSED_KEY = "fe_wa_callout_dismissed";

export default function WhatsAppLeadButton({ onOpen }) {
  const [showCallout, setShowCallout] = useState(false);
  const calloutTimers = useRef({ show: null, hide: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(CALLOUT_DISMISSED_KEY) === "1";
    } catch {
      // ignore storage errors
    }
    if (dismissed) return;

    const timers = calloutTimers.current;
    timers.show = window.setTimeout(() => setShowCallout(true), SHOW_CALLOUT_AFTER_MS);
    timers.hide = window.setTimeout(() => setShowCallout(false), HIDE_CALLOUT_AFTER_MS);

    return () => {
      if (timers.show) window.clearTimeout(timers.show);
      if (timers.hide) window.clearTimeout(timers.hide);
    };
  }, []);

  const dismissCallout = () => {
    setShowCallout(false);
    try { sessionStorage.setItem(CALLOUT_DISMISSED_KEY, "1"); } catch { /* ignore */ }
  };

  const handleClick = () => {
    dismissCallout();
    trackEvent("cta_click", "whatsapp_floating_button");
    onOpen?.("floating");
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2 print:hidden">
        {showCallout && (
          <div
            role="status"
            className="relative max-w-[260px] rounded-2xl bg-white border border-slate-200 shadow-xl px-4 py-3 animate-fade-in-up"
          >
            <button
              type="button"
              onClick={dismissCallout}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              aria-label="Cerrar mensaje"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              ¿Tienes preguntas sobre tu ELEAM?
            </p>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              Chatea con nosotros, respondemos en menos de 1 hora hábil.
            </p>
            <div className="absolute -bottom-2 right-7 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" aria-hidden="true" />
          </div>
        )}

        <div className="relative group">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping-slow pointer-events-none"
          />
          <button
            type="button"
            onClick={handleClick}
            aria-label="Chatear con FichaEleam por WhatsApp"
            className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#1ebe57] active:bg-[#179a4a] text-white shadow-xl shadow-emerald-900/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            <WhatsAppIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"
              title="En línea"
            />
          </button>

          <span
            className="hidden sm:block pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-xl bg-slate-900 text-white text-xs font-semibold px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg"
          >
            Chatea con nosotros
            <span className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 rotate-45" aria-hidden="true" />
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping-slow, .animate-fade-in-up { animation: none; }
        }
      `}</style>
    </>
  );
}
