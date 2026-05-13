import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../services/supabaseConfig";
import Loading from "../../components/Loading";
import GuidedDemoShell from "./GuidedDemoShell";
import DemoRequestModal from "../landing/DemoRequestModal";
import { trackEvent } from "../landing/landingAnalytics";

const HEARTBEAT_INTERVAL = 90_000; // 90 s

export default function GuidedDemoPage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const [lead, setLead]     = useState(null);
  const [status, setStatus] = useState("loading"); // loading | valid | invalid | expired
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    let cancelled = false;
    supabase
      .from("demo_leads")
      .select("id, demo_token, demo_expires_at, demo_progreso, nombre")
      .eq("demo_token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) { setStatus("invalid"); return; }
        if (new Date(data.demo_expires_at) < new Date()) { setStatus("expired"); return; }
        setLead(data);
        setStatus("valid");
        trackEvent("demo_step", "demo_open", token);
        // Registrar primer ping inmediatamente
        supabase.from("demo_leads").update({
          demo_ultimo_ping: new Date().toISOString(),
          estado: "demo_activo",
        }).eq("demo_token", token).then(() => {});
      });
    return () => { cancelled = true; };
  }, [token]);

  // Heartbeat
  useEffect(() => {
    if (status !== "valid") return;
    const id = setInterval(() => {
      supabase.from("demo_leads")
        .update({ demo_ultimo_ping: new Date().toISOString() })
        .eq("demo_token", token)
        .then(() => {});
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(id);
  }, [status, token]);

  const handleProgresoUpdate = useCallback((progreso) => {
    if (!token) return;
    supabase.from("demo_leads")
      .update({ demo_progreso: progreso })
      .eq("demo_token", token)
      .then(() => {});
  }, [token]);

  if (status === "loading") return <Loading message="Cargando demo..." />;

  if (status === "invalid" || status === "expired") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            {status === "expired" ? "Demo expirado" : "Enlace no válido"}
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {status === "expired"
              ? "El período de acceso a este demo ha expirado. Solicita un nuevo enlace para continuar."
              : "Este enlace de demo no existe o ya fue utilizado. Solicita acceso para recibir tu enlace personalizado."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"

              onClick={() => setShowModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm"
            >
              Solicitar nuevo acceso
            </button>
            <button
              type="button"

              onClick={() => navigate("/")}
              className="text-sm text-slate-500 hover:underline"
            >
              Volver al inicio
            </button>
          </div>
        </div>
        <DemoRequestModal isOpen={showModal} onClose={() => setShowModal(false)} defaultCta="expired_demo" />
      </div>
    );
  }

  return (
    <GuidedDemoShell
      token={token}
      leadId={lead?.id}
      onProgresoUpdate={handleProgresoUpdate}
    />
  );
}
