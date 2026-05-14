import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseConfig";
import { validateEmail } from "../../utils/validators";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { authErrorMessage } from "./authService";

export default function RecuperarAcceso() {
  const navigate = useNavigate();
  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const clean = email.trim();
    if (!validateEmail(clean)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSubmitted(true);
    } catch (err) {
      console.warn("reset password error:", err);
      setError(authErrorMessage(err, "No pudimos enviar el correo. Intenta nuevamente en unos minutos."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
          FichaEleam
        </button>
        <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Revisa tu correo</h1>
            <p className="text-sm text-slate-500">
              Si <span className="font-medium text-slate-700">{email.trim()}</span> tiene una cuenta, recibirás un link de recuperación en los próximos minutos.
            </p>
            <p className="text-xs text-slate-400">El link expira en 1 hora. Revisa también tu carpeta de spam.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-4 text-sm text-teal-700 hover:underline font-medium"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Recuperar contraseña</h1>
              <p className="text-sm text-slate-500 mt-1">
                Ingresa tu correo y te enviaremos un link para restablecerla.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
                <Input
                  type="email"
                  placeholder="tu@email.cl"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {error && (
                <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Enviando..." : "Enviar link de recuperación"}
              </Button>
            </form>

            <p className="text-sm text-center text-slate-400 mt-6">
              <button type="button"
 onClick={() => navigate("/login")} className="text-teal-700 hover:underline">
                ← Volver al inicio de sesión
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
