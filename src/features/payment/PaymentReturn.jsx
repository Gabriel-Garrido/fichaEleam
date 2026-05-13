import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";

// Página a la que MercadoPago redirige después del checkout.
// El estado real llega vía webhook → puede tardar unos segundos.
// Hacemos polling al perfil/eleam hasta confirmar activación.

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { eleam, subscriptionStatus, refetchProfile, profileLoading } = useAuth();
  const [polled, setPolled] = useState(0);

  // status del query (collection_status, status, preapproval_status)
  const mpStatus = params.get("status") || params.get("collection_status") || "";

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      if (typeof refetchProfile === "function") refetchProfile();
      setPolled((n) => n + 1);
    }, 2500);
    // detener tras 30s
    const stop = setTimeout(() => clearInterval(interval), 30_000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, [refetchProfile]);

  const isActive = ["activo", "en_gracia"].includes(subscriptionStatus);
  const isPending = ["pendiente"].includes(subscriptionStatus);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-md p-10 text-center">
        {profileLoading || (isPending && polled < 12) ? (
          <>
            <Loading message="Confirmando tu pago con MercadoPago..." />
            <p className="text-xs text-slate-400 mt-4">
              Esto puede tomar unos segundos. No cierres esta página.
            </p>
          </>
        ) : isActive ? (
          <>
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-emerald-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">
              ¡Tu suscripción quedó activa!
            </h1>
            <p className="text-slate-500 mb-6">
              {eleam?.nombre} ya puede acceder al panel completo de FichaEleam.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800"
            >
              Ir al panel
            </button>
          </>
        ) : (
          <>
            <div className="text-amber-500 text-5xl mb-3">!</div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">
              Tu pago aún no se ha confirmado
            </h1>
            <p className="text-slate-500 mb-6 text-sm">
              {mpStatus
                ? `Estado reportado por MercadoPago: ${mpStatus}.`
                : "MercadoPago todavía no envió la confirmación."}
              {" "}
              Puedes esperar unos minutos o revisar la página de pago para reintentar.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate("/pago")}
                className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800"
              >
                Volver a pago
              </button>
              <button
                onClick={() => refetchProfile?.()}
                className="border border-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50"
              >
                Reintentar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
