import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PLANES = [
  { residentes: "Hasta 14",  precio: "$50.000",  desc: "Ideal para residencias pequeñas" },
  { residentes: "15 a 24",   precio: "$80.000",  desc: "El más elegido",       popular: true },
  { residentes: "25 a 34",   precio: "$120.000", desc: "Para residencias grandes" },
  { residentes: "35 o más",  precio: "Consultar",desc: "Tarifa personalizada" },
];

const INCLUYE = [
  "Fichas clínicas digitales para todos tus residentes",
  "Registro diario de signos vitales por turno",
  "Observaciones de turno con 12 categorías",
  "Sistema de documentación SEREMI (DS 14/2017)",
  "Acceso para todos tus funcionarios",
  "Soporte por correo electrónico",
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sinAcceso = params.get("sinAcceso") === "1";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav mínima */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-black text-[var(--color-primary)] tracking-tight">
            FichaEleam
          </button>
          <button onClick={() => navigate("/login")} className="text-sm text-[var(--color-primary)] hover:underline">
            Ya tengo cuenta
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Banner sin acceso */}
        {sinAcceso && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <div className="text-amber-500 text-2xl shrink-0">⚠️</div>
            <div>
              <h3 className="font-bold text-amber-800 mb-1">Tu ELEAM no tiene suscripción activa</h3>
              <p className="text-sm text-amber-700">
                Para acceder a la plataforma, el administrador del establecimiento debe activar el plan mensual.
                Selecciona el plan que corresponde al tamaño de tu residencia.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-800 mb-3">
            Activa tu ELEAM
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Un precio mensual por establecimiento. Sin cobros por usuario.
            Todos tus funcionarios acceden incluidos.
          </p>
        </div>

        {/* Aviso temporal */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-10 flex gap-4 items-start">
          <div className="shrink-0 mt-0.5 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 text-sm mb-1">Sistema de pago en preparación</h3>
            <p className="text-sm text-blue-700">
              Estamos integrando el módulo de pagos. Por ahora, escríbenos directamente a{" "}
              <a href="mailto:contacto@fichaeleam.cl" className="underline font-medium">
                contacto@fichaeleam.cl
              </a>{" "}
              para activar tu cuenta manualmente. Respondemos en menos de 24 horas.
            </p>
          </div>
        </div>

        {/* Planes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {PLANES.map(({ residentes, precio, desc, popular }, i) => (
            <div
              key={i}
              className={`rounded-2xl p-5 border-2 text-center relative ${
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
                {residentes} residentes
              </p>
              <p className={`text-2xl font-black mb-0.5 ${popular ? "text-white" : "text-gray-800"}`}>
                {precio}
              </p>
              {precio !== "Consultar" && (
                <p className={`text-xs mb-2 ${popular ? "text-teal-200" : "text-gray-400"}`}>CLP / mes</p>
              )}
              <p className={`text-xs ${popular ? "text-teal-100" : "text-gray-500"}`}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Lo que incluye */}
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

        {/* CTA */}
        <div className="text-center space-y-4">
          <a
            href="mailto:contacto@fichaeleam.cl?subject=Activar%20FichaEleam"
            className="inline-flex bg-[var(--color-primary)] text-white font-bold py-3.5 px-10 rounded-xl hover:bg-[var(--color-button-hover)] transition-all shadow-md hover:shadow-lg text-base"
          >
            Contactar para activar mi ELEAM →
          </a>
          <p className="text-xs text-gray-400">
            O escríbenos a contacto@fichaeleam.cl — respondemos en menos de 24 horas
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/demo")}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Explorar el demo primero
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
