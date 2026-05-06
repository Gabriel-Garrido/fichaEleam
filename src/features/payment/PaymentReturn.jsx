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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-md p-10 text-center">
        {profileLoading || (isPending && polled < 12) ? (
          <>
            <Loading message="Confirmando tu pago con MercadoPago..." />
            <p className="text-xs text-gray-400 mt-4">
              Esto puede tomar unos segundos. No cierres esta página.
            </p>
          </>
        ) : isActive ? (
          <>
            <div className="text-emerald-500 text-5xl mb-3">✓</div>
            <h1 className="text-2xl font-black text-gray-800 mb-2">
              ¡Tu suscripción quedó activa!
            </h1>
            <p className="text-gray-500 mb-6">
              {eleam?.nombre} ya puede acceder al panel completo de FichaEleam.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-[var(--color-primary)] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[var(--color-button-hover)]"
            >
              Ir al panel
            </button>
          </>
        ) : (
          <>
            <div className="text-amber-500 text-5xl mb-3">!</div>
            <h1 className="text-2xl font-black text-gray-800 mb-2">
              Tu pago aún no se ha confirmado
            </h1>
            <p className="text-gray-500 mb-6 text-sm">
              {mpStatus
                ? `Estado reportado por MercadoPago: ${mpStatus}.`
                : "MercadoPago todavía no envió la confirmación."}
              {" "}
              Puedes esperar unos minutos o revisar la página de pago para reintentar.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate("/pago")}
                className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)]"
              >
                Volver a pago
              </button>
              <button
                onClick={() => refetchProfile?.()}
                className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50"
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
