import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";

// Página de retorno desde MercadoPago después del checkout de suscripción.
//
// MP redirige a back_url con query params:
//   collection_status / status  — approved | pending | rejected | cancelled
//   payment_id                  — ID del pago (si aplica)
//   merchant_order_id           — ID de la orden MP
//   external_reference          — eleam.id que enviamos al crear el preapproval
//
// El estado real llega vía webhook → hacemos polling al perfil/ELEAM.
// Si MP informa rechazo Y la suscripción no está activa, dejamos de esperar.

const MAX_POLLS = 20;     // 20 × 3s = 60s antes de mostrar pantalla de acción
const POLL_INTERVAL = 3000;
const SUCCESS_REDIRECT_DELAY = 3500;

function resolveMpStatus(params) {
  const raw =
    params.get("collection_status") ||
    params.get("status") ||
    "";
  const lower = raw.toLowerCase();
  if (["approved", "authorized"].includes(lower)) return "success";
  if (["pending", "in_process", "in_mediation"].includes(lower)) return "pending";
  if (["rejected", "cancelled", "failure", "refunded", "charged_back"].includes(lower)) return "failure";
  return "unknown";  // sin parámetros: llegamos desde back_url sin indicador de MP
}

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { eleam, subscriptionStatus, refetchProfile, profileLoading } = useAuth();

  const mpStatus = resolveMpStatus(params);
  const paymentId = params.get("payment_id") || params.get("preapproval_id") || null;
  const merchantOrderId = params.get("merchant_order_id") || null;

  const [polled, setPolled] = useState(0);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const redirectTimer = useRef(null);

  const isActive = ["activo", "en_gracia"].includes(subscriptionStatus);
  // Failure definitivo: MP dijo que falló Y la DB también lo confirma (no activo)
  const isDefiniteFailure =
    mpStatus === "failure" && !isActive && !profileLoading && polled >= 2;

  // Polling: continúa mientras no esté activo ni definitivamente fallido
  useEffect(() => {
    if (isActive || isDefiniteFailure) return;

    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      if (polled >= MAX_POLLS) { clearInterval(interval); return; }
      refetchProfile?.();
      setPolled((n) => n + 1);
    }, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, isDefiniteFailure, polled, refetchProfile]);

  // Auto-redirect a dashboard cuando la suscripción queda activa
  useEffect(() => {
    if (!isActive) return;
    setAutoRedirecting(true);
    redirectTimer.current = setTimeout(() => navigate("/dashboard"), SUCCESS_REDIRECT_DELAY);
    return () => clearTimeout(redirectTimer.current);
  }, [isActive, navigate]);

  // ── Success ────────────────────────────────────────────────────────
  if (isActive) {
    return (
      <ReturnShell>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-emerald-500" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          ¡Suscripción activada!
        </h1>
        <p className="text-slate-500 mb-1">
          {eleam?.nombre ?? "Tu ELEAM"} ya tiene acceso completo a FichaEleam.
        </p>
        {paymentId && (
          <p className="text-xs text-slate-400 mb-5">
            Referencia de pago: <span className="font-mono">{paymentId}</span>
          </p>
        )}
        <p className="text-xs text-slate-400 mb-6">
          {autoRedirecting
            ? "Redirigiendo al panel en unos segundos…"
            : "Ya puedes acceder al panel."}
        </p>
        <button
          type="button"
          onClick={() => { clearTimeout(redirectTimer.current); navigate("/dashboard"); }}
          className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800"
        >
          Ir al panel
        </button>
      </ReturnShell>
    );
  }

  // ── Failure definitivo ─────────────────────────────────────────────
  if (isDefiniteFailure) {
    return (
      <ReturnShell>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-rose-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-rose-500" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          El pago no fue aprobado
        </h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          MercadoPago informó que el pago fue rechazado o cancelado.
          Puedes intentarlo nuevamente con otro medio de pago.
          Si el problema persiste, contáctanos por WhatsApp.
        </p>
        {(paymentId || merchantOrderId) && (
          <p className="text-xs text-slate-400 mb-5">
            {paymentId && <>Referencia: <span className="font-mono">{paymentId}</span></>}
            {paymentId && merchantOrderId && " · "}
            {merchantOrderId && <>Orden: <span className="font-mono">{merchantOrderId}</span></>}
          </p>
        )}
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/pago")}
            className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800"
          >
            Reintentar pago
          </button>
          <a
            href="https://wa.me/56951187764"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50"
          >
            Contactar soporte
          </a>
        </div>
      </ReturnShell>
    );
  }

  // ── Pending / esperando webhook ────────────────────────────────────
  const timedOut = polled >= MAX_POLLS && !profileLoading;

  function handleVerifyNow() {
    refetchProfile?.();
    setPolled(0);
  }

  return (
    <ReturnShell>
      {!timedOut ? (
        <>
          <div className="mb-4">
            <Loading message="" />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">
            {mpStatus === "success"
              ? "Confirmando tu suscripción…"
              : "Procesando el pago…"}
          </h1>
          <p className="text-sm text-slate-500 mb-1">
            {mpStatus === "success"
              ? "MercadoPago confirmó el pago. Activando tu acceso…"
              : "Esperando confirmación de MercadoPago. Esto puede tardar unos segundos."}
          </p>
          {paymentId && (
            <p className="text-xs text-slate-400 mt-2">
              Referencia: <span className="font-mono">{paymentId}</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Tu historial clínico y toda la configuración quedan intactos.
          </p>
        </>
      ) : (
        <>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-amber-500" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">
            {mpStatus === "success" ? "El pago fue recibido" : "La confirmación está tardando"}
          </h1>
          <p className="text-sm text-slate-600 mb-2 leading-relaxed font-medium">
            {mpStatus === "success"
              ? "Tu pago fue procesado por MercadoPago, pero la confirmación está tardando más de lo esperado."
              : "Aún no recibimos la confirmación de MercadoPago. Si completaste el pago, la activación llegará en unos minutos."}
          </p>
          <p className="text-sm text-slate-500 mb-1 leading-relaxed">
            Esto es normal — la confirmación puede tardar entre 2 y 10 minutos.
            Haz clic en <strong>Verificar ahora</strong> cada 2 minutos hasta que se active.
          </p>
          {paymentId && (
            <p className="text-xs text-slate-400 mt-2 mb-4">
              Referencia de pago: <span className="font-mono">{paymentId}</span>
            </p>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-1">¿Sigues viendo esta pantalla después de 10 minutos?</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Escríbenos a <strong>soporte@fichaeleam.cl</strong> con la referencia de pago de arriba
              y lo activamos manualmente de inmediato.
            </p>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleVerifyNow}
              className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800"
            >
              Verificar ahora
            </button>
            <a
              href="https://wa.me/56951187764"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50"
            >
              Contactar soporte
            </a>
          </div>
          <button
            type="button"
            onClick={() => navigate("/pago")}
            className="mt-4 text-xs font-semibold text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Volver a planes
          </button>
        </>
      )}
    </ReturnShell>
  );
}

function ReturnShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-md p-10 text-center">
        {children}
      </div>
    </div>
  );
}
