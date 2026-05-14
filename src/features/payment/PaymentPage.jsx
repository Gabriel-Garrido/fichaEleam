import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import HelpTooltip from "../../components/HelpTooltip";
import { friendlyError } from "../../utils/errorMessages";
import { logout } from "../auth/authService";
import { useSEO } from "../../utils/seo";
import {
  getActivePlans,
  startSubscription,
  cancelSubscription,
  getMyPayments,
} from "./paymentService";
import { formatDate } from "../../utils/dateUtils";

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return null;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

const INCLUYE = [
  "Fichas clínicas digitales para todos tus residentes",
  "Registro diario de signos vitales por turno",
  "Observaciones de turno con 12 categorías",
  "Sistema de documentación SEREMI (DS 14/2017)",
  "Acceso para todos tus funcionarios sin costo adicional",
  "Soporte por correo electrónico",
];

function formatCLP(monto) {
  if (monto == null) return "—";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency", currency: "CLP", maximumFractionDigits: 0,
    }).format(monto);
  } catch {
    return `$${monto.toLocaleString("es-CL")}`;
  }
}

const SUBSCRIPTION_LABEL = {
  activo: { txt: "Suscripción activa", cls: "bg-emerald-100 text-emerald-700" },
  en_gracia: { txt: "Cobro en reintento", cls: "bg-amber-100 text-amber-800" },
  pendiente: { txt: "Pago pendiente", cls: "bg-blue-100 text-blue-700" },
  pausado: { txt: "Suscripción pausada", cls: "bg-slate-100 text-slate-700" },
  cancelado: { txt: "Suscripción cancelada", cls: "bg-rose-100 text-rose-700" },
  vencido: { txt: "Suscripción vencida", cls: "bg-rose-100 text-rose-700" },
  inactivo: { txt: "Activación pendiente", cls: "bg-amber-100 text-amber-800" },
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const {
    user, profile, eleam, pagoActivo, subscriptionStatus, isAdminEleam, rol,
  } = useAuth();
  const sinAcceso = params.get("sinAcceso") === "1";
  const blockedNonAdmin = Boolean(user && !isAdminEleam && sinAcceso);

  useSEO({
    title: "Planes y precios · activa tu ELEAM",
    description:
      "Planes mensuales en CLP para tu ELEAM en Chile. Pago con MercadoPago. Funcionarios y familias incluidos. Cancela cuando quieras.",
    path: "/pago",
    keywords: ["precio software ELEAM", "planes ELEAM Chile", "FichaEleam precio"],
  });
  const accountEmail = profile?.email || user?.email || "";

  const [plans, setPlans] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingPlans(true);
    // Solo el admin del ELEAM puede ver el historial de pagos.
    Promise.allSettled([
      getActivePlans(),
      isAdminEleam ? getMyPayments() : Promise.resolve([]),
    ])
      .then(([p1, p2]) => {
        if (!active) return;
        if (p1.status === "fulfilled") setPlans(p1.value);
        if (p2.status === "fulfilled") setPagos(p2.value);
      })
      .finally(() => active && setLoadingPlans(false));
    return () => { active = false; };
  }, [user, isAdminEleam]);

  const handleLogout = async () => {
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  };

  const handleStart = async (codigo) => {
    if (!user) {
      toast("Para contratar FichaEleam, solicita una demo y habilitaremos tu cuenta.", "info");
      navigate("/");
      return;
    }
    if (!isAdminEleam) {
      toast(
        "Solo el administrador del ELEAM puede contratar la suscripción. Contáctalo para que active el plan.",
        "warning",
      );
      return;
    }
    setLoadingAction(true);
    try {
      const res = await startSubscription({ planCodigo: codigo });
      // Validate init_point is from MercadoPago before redirecting.
      const mpUrl = new URL(res.init_point);
      if (!mpUrl.hostname.endsWith(".mercadopago.com") && mpUrl.hostname !== "mercadopago.com") {
        throw new Error("URL de pago inválida. Contacta a soporte.");
      }
      window.location.href = res.init_point;
    } catch (e) {
      toast(friendlyError(e, "No se pudo iniciar el proceso de pago. Intenta de nuevo o contacta soporte."), "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = async () => {
    const ok = window.confirm(
      "¿Cancelar la suscripción? Mantendrás el acceso hasta el final del período pagado."
    );
    if (!ok) return;
    setLoadingAction(true);
    try {
      await cancelSubscription();
      toast("Suscripción cancelada", "success");
      // Refresca al volver
      window.setTimeout(() => navigate(0), 800);
    } catch (e) {
      toast(friendlyError(e, "No se pudo cancelar la suscripción. Intenta de nuevo o contacta soporte."), "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const statusInfo = SUBSCRIPTION_LABEL[subscriptionStatus] ?? SUBSCRIPTION_LABEL.inactivo;
  const proximo = eleam?.proximo_cobro_en ?? eleam?.fecha_vencimiento_suscripcion ?? null;
  const isDemo = isAdminEleam && eleam?.plan === "demo";
  const demoExpiry = eleam?.fecha_vencimiento_suscripcion ?? null;
  const demoDaysLeft = daysUntil(demoExpiry);
  const demoExpired = demoDaysLeft != null && demoDaysLeft < 0;
  const showPublicNav = !user;

  return (
    <div className={showPublicNav ? "min-h-screen bg-slate-50" : ""}>
      {/* Nav mínima */}
      {showPublicNav && (
      <nav className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xl font-black text-teal-700 tracking-tight"
          >
            FichaEleam
          </button>
          <div className="flex items-center gap-3">
            {user && pagoActivo && (
              <button type="button"
 onClick={() => navigate("/dashboard")} className="text-sm text-teal-700 hover:underline">
                Ir al panel
              </button>
            )}
            {user ? (
              <button type="button"
 onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700">
                Cerrar sesión
              </button>
            ) : (
              <button type="button"
 onClick={() => navigate("/login")} className="text-sm text-teal-700 hover:underline">
                Ya tengo cuenta
              </button>
            )}
          </div>
        </div>
      </nav>
      )}

      <div className={`${showPublicNav ? "max-w-5xl py-12" : "max-w-7xl py-5 sm:px-6 lg:px-8 lg:py-8"} mx-auto px-4`}>
        {sinAcceso && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="text-amber-500 text-2xl shrink-0">!</div>
            <div>
              <h3 className="font-bold text-amber-800 mb-1">
                {blockedNonAdmin
                  ? "Tu acceso está suspendido por estado de suscripción"
                  : user
                    ? "Tu sesión está activa, falta activar el ELEAM"
                    : "Tu ELEAM no tiene suscripción activa"}
              </h3>
              <p className="text-sm text-amber-700">
                {blockedNonAdmin
                  ? "Tu usuario existe, pero el ELEAM debe tener demo aprobada o suscripción vigente para usar la plataforma."
                  : "Para acceder al panel de gestión, el establecimiento debe quedar habilitado."}
                {user && accountEmail ? ` Estás conectado como ${accountEmail}.` : " Selecciona el plan que corresponde al tamaño de tu residencia."}
              </p>
            </div>
          </div>
        )}

        {user && !isAdminEleam && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="shrink-0 mt-0.5 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 text-sm mb-1">
                {blockedNonAdmin
                  ? "Debes contactar al administrador del ELEAM"
                  : "La suscripción la administra el dueño del ELEAM"}
              </h3>
              <p className="text-sm text-blue-700">
                {blockedNonAdmin
                  ? "Funcionarios y familiares no pueden activar pagos. Pide al administrador que regularice la suscripción o solicita que el superadmin revise el demo."
                  : "Tu acceso está incluido sin costo mientras el administrador del ELEAM mantenga la suscripción activa. Si crees que la suscripción debería estar activa, contáctalo."}
              </p>
              {rol && (
                <p className="text-xs text-blue-600 mt-2">
                  Tipo de cuenta: <span className="font-semibold">{rol}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Demo status banner ─────────────────────────────── */}
        {isDemo && (
          <div className={`rounded-2xl border mb-8 overflow-hidden ${demoExpired ? "border-rose-200" : "border-amber-200"}`}>
            {/* Top accent strip */}
            <div className={`h-1.5 ${demoExpired ? "bg-rose-500" : "bg-amber-400"}`} />
            <div className={`p-5 sm:p-6 ${demoExpired ? "bg-rose-50" : "bg-amber-50"}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${demoExpired ? "bg-rose-100" : "bg-amber-100"}`}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-5 w-5 ${demoExpired ? "text-rose-600" : "text-amber-700"}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-bold text-base ${demoExpired ? "text-rose-900" : "text-amber-900"}`}>
                      {demoExpired ? "Período de prueba vencido" : "Período de prueba activo"}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${demoExpired ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-900"}`}>
                      DEMO
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${demoExpired ? "text-rose-700" : "text-amber-800"}`}>
                    {demoDaysLeft == null
                      ? "Estás en modo demo. Elige un plan para activar tu suscripción completa."
                      : demoExpired
                        ? `El acceso demo venció hace ${Math.abs(demoDaysLeft)} día${Math.abs(demoDaysLeft) !== 1 ? "s" : ""}. Activa un plan para recuperar el acceso completo.`
                        : demoDaysLeft === 0
                          ? "Tu demo vence hoy. Elige un plan a continuación para continuar sin interrupciones."
                          : `Tienes ${demoDaysLeft} día${demoDaysLeft !== 1 ? "s" : ""} restante${demoDaysLeft !== 1 ? "s" : ""} de prueba${demoExpiry ? ` · vence el ${formatDate(demoExpiry)}` : ""}. Elige un plan para continuar.`}
                  </p>
                  <p className={`mt-2 text-xs font-semibold ${demoExpired ? "text-rose-600" : "text-amber-700"}`}>
                    {eleam.nombre}
                  </p>
                  {/* Countdown bar */}
                  {!demoExpired && demoDaysLeft != null && demoDaysLeft >= 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Tiempo restante</p>
                        <p className="text-[10px] font-bold text-amber-800">{demoDaysLeft}d / 30d</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-amber-200/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.max(2, Math.min(100, (demoDaysLeft / 30) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Active subscription card (non-demo admin) ──────── */}
        {user && eleam && !isDemo && isAdminEleam && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Status stripe */}
            <div className={`h-1 ${pagoActivo ? "bg-emerald-500" : subscriptionStatus === "en_gracia" ? "bg-amber-400" : "bg-rose-400"}`} />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left: details */}
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Suscripción</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                      {statusInfo.txt}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold leading-tight text-slate-900">{eleam.nombre}</h2>

                  {eleam.planes?.nombre ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Plan{" "}
                      <span className="font-semibold text-slate-800">{eleam.planes.nombre}</span>
                      {eleam.planes.precio_clp != null && (
                        <>
                          {" · "}
                          <span className="font-semibold text-slate-800">{formatCLP(eleam.planes.precio_clp)}</span>
                          <span className="text-slate-400"> / mes</span>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">{accountEmail}</p>
                  )}

                  {/* Renewal / expiration */}
                  {proximo && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                      <span className="text-slate-500">
                        {pagoActivo ? "Próximo cobro:" : "Acceso hasta:"}
                        {" "}
                        <span className="font-semibold text-slate-700">{formatDate(proximo)}</span>
                      </span>
                      {(() => {
                        const days = daysUntil(proximo);
                        if (days == null) return null;
                        if (days < 0) return <span className="font-semibold text-rose-600">(vencido)</span>;
                        if (days <= 7) return <span className="font-semibold text-amber-600">({days} días)</span>;
                        return <span className="text-slate-400">({days} días)</span>;
                      })()}
                    </div>
                  )}

                  {/* Plan limits */}
                  {(eleam.max_residentes || eleam.max_funcionarios) && (
                    <div className="mt-3 flex flex-wrap gap-4">
                      {eleam.max_residentes && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                          Hasta{" "}
                          <span className="font-semibold text-slate-700">{eleam.max_residentes}</span>
                          {" "}residentes
                        </div>
                      )}
                      {eleam.max_funcionarios && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Hasta{" "}
                          <span className="font-semibold text-slate-700">{eleam.max_funcionarios}</span>
                          {" "}funcionarios
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {pagoActivo && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loadingAction}
                      className="text-xs font-medium text-rose-500 transition-colors hover:text-rose-700 disabled:opacity-50"
                    >
                      Cancelar suscripción
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription card for non-admin with an eleam (funcionario / familiar) */}
        {user && eleam && !isDemo && !isAdminEleam && (
          <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">Estado de acceso</p>
                <h2 className="font-bold text-slate-900">{eleam.nombre}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{accountEmail}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.cls}`}>
                {statusInfo.txt}
              </span>
            </div>
          </div>
        )}

        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            {isDemo ? "Planes disponibles" : "Suscripción"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {blockedNonAdmin
              ? "Acceso pendiente del ELEAM"
              : isDemo
                ? "Elige el plan para continuar"
                : "Activa tu ELEAM"}
            {!blockedNonAdmin && (
              <HelpTooltip className="ml-2" label="Ayuda sobre activación">
                Elige el plan según residentes activos. El pago lo procesa MercadoPago y el acceso se habilita automáticamente cuando el webhook confirma el cobro.
              </HelpTooltip>
            )}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {blockedNonAdmin
              ? "Tu cuenta fue creada correctamente, pero la habilitación del establecimiento la gestiona el administrador ELEAM."
              : isDemo
                ? "Un precio mensual por establecimiento. Tu historial clínico y toda la configuración se mantienen al activar."
                : "Un precio mensual por establecimiento. Sin cobros por usuario. Todos tus funcionarios acceden incluidos."}
          </p>
        </div>

        {/* Planes dinámicos */}
        {loadingPlans ? (
          <div className="text-center text-slate-500 py-8">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800">
            Aún no hay planes configurados. Contacta al administrador.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {plans.map((p) => {
              const popular = p.destacado;
              const isCurrent = eleam?.plan_id === p.id && pagoActivo;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-6 border-2 text-center relative flex flex-col ${
                    popular
                      ? "border-teal-700 bg-teal-700 text-white shadow-xl"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-800 text-white text-xs px-3 py-0.5 rounded-full font-semibold whitespace-nowrap">
                      Más elegido
                    </span>
                  )}
                  <p className={`text-xs font-bold mb-1 ${popular ? "text-teal-200" : "text-slate-400"}`}>
                    {p.nombre}
                  </p>
                  <p className={`text-3xl font-black mb-0.5 ${popular ? "text-white" : "text-slate-800"}`}>
                    {formatCLP(p.precio_clp)}
                  </p>
                  <p className={`text-xs mb-4 ${popular ? "text-teal-200" : "text-slate-400"}`}>
                    CLP / mes
                  </p>
                  <ul className={`text-xs mb-6 space-y-1 ${popular ? "text-teal-100" : "text-slate-500"}`}>
                    <li>Hasta {p.max_residentes ?? "∞"} residentes activos</li>
                    <li>Hasta {p.max_funcionarios ?? "∞"} funcionarios</li>
                  </ul>
                  <div className="mt-auto">
                    {isCurrent ? (
                      <span className={`inline-flex w-full justify-center font-semibold py-2 rounded-xl ${
                        popular ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        Plan actual
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStart(p.codigo)}
                        disabled={loadingAction || (user && !isAdminEleam)}
                        className={`w-full font-semibold py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          popular
                            ? "bg-white text-teal-700 hover:bg-slate-100"
                            : "bg-teal-700 text-white hover:bg-teal-800"
                        }`}
                      >
                        {loadingAction ? "Procesando..." : (user && !isAdminEleam ? "Solo admin ELEAM" : isDemo ? "Activar plan" : user ? "Suscribirme" : "Solicitar demo")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="font-bold text-slate-800 mb-4">Todos los planes incluyen</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INCLUYE.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Historial de pagos */}
        {user && pagos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <h2 className="font-bold text-slate-800 mb-4">Historial de pagos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Fecha</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{formatDate(p.fecha_pago)}</td>
                      <td>{formatCLP(p.monto)}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          p.estado === "completado" ? "bg-emerald-100 text-emerald-700" :
                          p.estado === "fallido"   ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{p.estado}</span>
                      </td>
                      <td className="text-slate-500">{p.metodo_pago ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Procesado por MercadoPago · puedes cancelar cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
}
