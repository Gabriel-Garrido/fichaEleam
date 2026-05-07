import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseConfig";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { authErrorMessage } from "./authService";

function strengthLabel(pw) {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const long     = pw.length >= 8;
  const veryLong = pw.length >= 12;
  const score    = [hasUpper, hasNum, long, veryLong].filter(Boolean).length;
  if (score <= 1) return { txt: "Débil",   cls: "bg-red-500",    bar: "w-1/4" };
  if (score === 2) return { txt: "Regular", cls: "bg-amber-400",  bar: "w-2/4" };
  if (score === 3) return { txt: "Buena",   cls: "bg-blue-500",   bar: "w-3/4" };
  return              { txt: "Muy fuerte", cls: "bg-emerald-500", bar: "w-full" };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);
  const [done, setDone]           = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired]   = useState(false);
  const [configError] = useState(!supabase);

  const strength = strengthLabel(password);

  useEffect(() => {
    if (!supabase) return;

    // Supabase inserta access_token en el hash después del reset.
    // El onAuthStateChange lo detecta y establece la sesión.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });

    // Si la sesión ya fue procesada antes de montar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Timeout: si después de 8s el link no fue reconocido, es inválido/expirado
    const timer = setTimeout(() => setLinkExpired(true), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const validatePassword = () => {
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(password)) return "Debe incluir al menos una letra mayúscula.";
    if (!/[0-9]/.test(password)) return "Debe incluir al menos un número.";
    if (password !== confirm) return "Las contraseñas no coinciden.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    const pwError = validatePassword();
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ must_reset_password: false })
          .eq("id", user.id);
      }

      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(authErrorMessage(err, err.message || "No se pudo actualizar la contraseña."));
    } finally {
      setSubmitting(false);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Supabase no configurado</h2>
          <p className="text-sm text-gray-500">No es posible restablecer contraseñas hasta configurar las variables de entorno.</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-button-hover)] transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          {linkExpired ? (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Link inválido o expirado</h2>
              <p className="text-sm text-gray-500">
                Este link de recuperación ya no es válido. Los links expiran en 1 hora.
              </p>
              <button
                onClick={() => navigate("/recuperar-acceso")}
                className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-button-hover)] transition-colors"
              >
                Solicitar nuevo link
              </button>
              <button onClick={() => navigate("/login")} className="text-sm text-gray-400 hover:text-gray-600">
                ← Volver al inicio de sesión
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <p className="text-gray-600 text-sm">Verificando link de recuperación...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Contraseña actualizada</h1>
          <p className="text-sm text-gray-500">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <button onClick={() => navigate("/")} className="text-2xl font-black text-[var(--color-primary)] tracking-tight">
          FichaEleam
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 space-y-6">
        <div>
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${strength.cls} ${strength.bar}`} />
                </div>
                <p className="text-xs text-gray-500">{strength.txt}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña</label>
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={submitting}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-button-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Guardando..." : "Establecer nueva contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
