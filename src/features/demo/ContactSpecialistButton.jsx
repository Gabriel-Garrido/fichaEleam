import React, { useState } from "react";
import { supabase } from "../../services/supabaseConfig";
import { trackEvent } from "../landing/landingAnalytics";

export default function ContactSpecialistButton({ token }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent

  async function handleSend() {
    setStatus("sending");
    try {
      await supabase
        .from("demo_leads")
        .update({
          solicita_contacto:          true,
          solicita_contacto_en:       new Date().toISOString(),
          solicita_contacto_mensaje:  msg.trim() || null,
        })
        .eq("demo_token", token);
      trackEvent("cta_click", "contact_specialist_demo", token);
      setStatus("sent");
    } catch {
      setStatus("sent"); // show success anyway — best effort
    }
  }

  return (
    <>
      <button
        onClick={() => { if (status !== "sent") setOpen(true); }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-xl font-semibold text-sm transition-all ${
          status === "sent"
            ? "bg-green-600 text-white cursor-default"
            : "bg-teal-600 hover:bg-teal-700 text-white"
        }`}
        aria-label="Hablar con especialista"
      >
        {status === "sent" ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Te contactaremos pronto
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Hablar con especialista
          </>
        )}
      </button>

      {open && status !== "sent" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-1">Habla con un especialista</h3>
            <p className="text-sm text-slate-500 mb-4">
              Te contactaremos en menos de 2 horas hábiles.
            </p>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="¿Tienes alguna pregunta específica? (opcional)"
              rows={3}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-xl text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={status === "sending"}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl text-sm"
              >
                {status === "sending" ? "Enviando..." : "Solicitar contacto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
