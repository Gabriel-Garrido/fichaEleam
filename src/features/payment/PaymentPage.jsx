import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { logout } from "../auth/authService";
import { useSEO } from "../../utils/seo";
import {
  getActivePlans,
  startSubscription,
  cancelSubscription,
  getMyPayments,
} from "./paymentService";

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

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
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
    user, profile, eleam, pagoActivo, subscriptionStatus, isAdminEleam,
  } = useAuth();
  const sinAcceso = params.get("sinAcceso") === "1";

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
      navigate(`/register`);
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
      // Redirige al checkout MP
      window.location.href = res.init_point;
    } catch (e) {
      toast(e.message || "Error al iniciar el pago", "error");
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
      toast(e.message || "No se pudo cancelar", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const statusInfo = SUBSCRIPTION_LABEL[subscriptionStatus] ?? SUBSCRIPTION_LABEL.inactivo;
  const proximo = eleam?.proximo_cobro_en ?? eleam?.fecha_vencimiento_suscripcion ?? null;
  const expectedSuperadminPending =
    accountEmail.toLowerCase() === "gabrielgarrido89@gmail.com" &&
    profile?.rol !== "superadmin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav mínima */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-black text-[var(--color-primary)] tracking-tight"
          >
            FichaEleam
          </button>
          <div className="flex items-center gap-3">
            {user && pagoActivo && (
              <button onClick={() => navigate("/dashboard")} className="text-sm text-[var(--color-primary)] hover:underline">
                Ir al panel
              </button>
            )}
            {user ? (
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
                Cerrar sesión
              </button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-sm text-[var(--color-primary)] hover:underline">
                Ya tengo cuenta
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {sinAcceso && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="text-amber-500 text-2xl shrink-0">!</div>
            <div>
              <h3 className="font-bold text-amber-800 mb-1">
                {user ? "Tu sesión está activa, falta activar el ELEAM" : "Tu ELEAM no tiene suscripción activa"}
              </h3>
              <p className="text-sm text-amber-700">
                Para acceder al panel de gestión, el establecimiento debe quedar habilitado.
                {user && accountEmail ? ` Estás conectado como ${accountEmail}.` : " Selecciona el plan que corresponde al tamaño de tu residencia."}
              </p>
            </div>
          </div>
        )}

        {expectedSuperadminPending && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="shrink-0 mt-0.5 w-6 h-6 bg-rose-200 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m0 3.75h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-rose-800 text-sm mb-1">
                Tu cuenta aún no está marcada como superadmin en Supabase
              </h3>
              <p className="text-sm text-rose-700">
                Re-ejecuta <code className="bg-white/70 px-1 py-0.5 rounded">supabase_schema.sql</code> en SQL Editor,
                o ejecuta el bloque de promoción de superadmin que está dentro del schema. Luego
                cierra sesión y vuelve a entrar. La vista Superadmin aparecerá después de que
                <code className="bg-white/70 px-1 py-0.5 rounded ml-1">profiles.rol</code> sea <code className="bg-white/70 px-1 py-0.5 rounded">superadmin</code>.
              </p>
            </div>
          </div>
        )}

        {user && !isAdminEleam && !expectedSuperadminPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="shrink-0 mt-0.5 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 text-sm mb-1">
                La suscripción la administra el dueño del ELEAM
              </h3>
              <p className="text-sm text-blue-700">
                Tu acceso está incluido sin costo mientras el administrador
                del ELEAM mantenga la suscripción activa. Si crees que la
                suscripción debería estar activa, contáctalo.
              </p>
            </div>
          </div>
        )}

        {user && eleam && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Cuenta conectada</p>
              <h2 className="font-bold text-gray-800">{eleam.nombre}</h2>
              <p className="text-sm text-gray-500">{accountEmail}</p>
              {eleam.planes?.nombre && (
                <p className="text-sm text-gray-600 mt-1">
                  Plan actual: <span className="font-semibold">{eleam.planes.nombre}</span>
                  {" — "}
                  {formatCLP(eleam.planes.precio_clp)} / mes
                </p>
              )}
              {proximo && pagoActivo && (
                <p className="text-xs text-gray-500 mt-1">
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

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-800 mb-3">Activa tu ELEAM</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Un precio mensual por establecimiento. Sin cobros por usuario.
            Todos tus funcionarios acceden incluidos.
          </p>
        </div>

        {/* Planes dinámicos */}
        {loadingPlans ? (
          <div className="text-center text-gray-500 py-8">Cargando planes...</div>
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
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xl"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-xs px-3 py-0.5 rounded-full font-semibold whitespace-nowrap">
                      Más elegido
                    </span>
                  )}
                  <p className={`text-xs font-bold mb-1 ${popular ? "text-teal-200" : "text-gray-400"}`}>
                    {p.nombre}
                  </p>
                  <p className={`text-3xl font-black mb-0.5 ${popular ? "text-white" : "text-gray-800"}`}>
                    {formatCLP(p.precio_clp)}
                  </p>
                  <p className={`text-xs mb-4 ${popular ? "text-teal-200" : "text-gray-400"}`}>
                    CLP / mes
                  </p>
                  <ul className={`text-xs mb-6 space-y-1 ${popular ? "text-teal-100" : "text-gray-500"}`}>
                    <li>Hasta {p.max_residentes ?? "∞"} residentes activos</li>
                    <li>Hasta {p.max_funcionarios ?? "∞"} funcionarios</li>
                  </ul>
                  <div className="mt-auto">
                    {isCurrent ? (
                      <span className={`inline-flex w-full justify-center font-semibold py-2 rounded-lg ${
                        popular ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        Plan actual
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStart(p.codigo)}
                        disabled={loadingAction || (user && !isAdminEleam)}
                        className={`w-full font-semibold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          popular
                            ? "bg-white text-[var(--color-primary)] hover:bg-gray-100"
                            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-button-hover)]"
                        }`}
                      >
                        {loadingAction ? "Procesando..." : (user ? "Suscribirme" : "Crear cuenta")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="font-bold text-gray-800 mb-4">Todos los planes incluyen</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INCLUYE.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="font-bold text-gray-800 mb-4">Historial de pagos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
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
                      <td className="text-gray-500">{p.metodo_pago ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-gray-400">
            Procesado por MercadoPago · puedes cancelar cuando quieras
          </p>
          <button
            onClick={() => navigate("/demo")}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Explorar el demo primero
          </button>
        </div>
      </div>
    </div>
  );
}
