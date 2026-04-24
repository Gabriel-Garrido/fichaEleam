import React from "react";
import { Link } from "react-router-dom";

export default function SupabaseError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Sin conexión a la base de datos
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          No fue posible conectar con Supabase. Verifica que las variables de
          entorno <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> y{" "}
          <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> estén configuradas.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors"
          >
            Reintentar
          </button>
          <Link
            to="/"
            className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm text-center hover:bg-gray-50 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
