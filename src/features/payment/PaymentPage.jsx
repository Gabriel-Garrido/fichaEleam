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

        {user && eleam && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Cuenta conectada</p>
              <h2 className="font-bold text-slate-800">{eleam.nombre}</h2>
              <p className="text-sm text-slate-500">{accountEmail}</p>
              {eleam.planes?.nombre && (
                <p className="text-sm text-slate-600 mt-1">
                  Plan actual: <span className="font-semibold">{eleam.planes.nombre}</span>
                  {" — "}
                  {formatCLP(eleam.planes.precio_clp)} / mes
                </p>
              )}
              {proximo && pagoActivo && (
                <p className="text-xs text-slate-500 mt-1">
                  Próximo cobro: {formatDate(proximo)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.cls}`}>
                {statusInfo.txt}
              </span>
              {pagoActivo && isAdminEleam && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loadingAction}
                  className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                >
                  Cancelar suscripción
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Suscripción
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {blockedNonAdmin ? "Acceso pendiente del ELEAM" : "Activa tu ELEAM"}
            {!blockedNonAdmin && (
              <HelpTooltip className="ml-2" label="Ayuda sobre activación">
                Elige el plan según residentes activos. El pago lo procesa MercadoPago y el acceso se habilita automáticamente cuando el webhook confirma el cobro.
              </HelpTooltip>
            )}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {blockedNonAdmin
              ? "Tu cuenta fue creada correctamente, pero la habilitación del establecimiento la gestiona el administrador ELEAM."
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
                        {loadingAction ? "Procesando..." : (user && !isAdminEleam ? "Solo admin ELEAM" : user ? "Suscribirme" : "Solicitar demo")}
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
