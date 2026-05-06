import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabaseConfig";
import Button from "../../components/Button";
import Input from "../../components/Input";

function strengthLabel(pw) {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const long     = pw.length >= 8;
  const veryLong = pw.length >= 12;
  const score    = [hasUpper, hasNum, long, veryLong].filter(Boolean).length;
  if (score <= 1) return { txt: "Débil",    cls: "bg-red-500",    bar: "w-1/4" };
  if (score === 2) return { txt: "Regular",  cls: "bg-amber-400",  bar: "w-2/4" };
  if (score === 3) return { txt: "Buena",    cls: "bg-blue-500",   bar: "w-3/4" };
  return              { txt: "Muy fuerte", cls: "bg-emerald-500", bar: "w-full" };
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, homePath, refetchProfile } = useAuth();

  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPw,   setShowPw]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,    setError]        = useState(null);

  const isGmail = (user?.email || "").toLowerCase().endsWith("@gmail.com");
  const strength = strengthLabel(password);

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
    const pwError = validatePassword();
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      await refetchProfile();
      toast("Contraseña actualizada correctamente", "success");
      navigate(homePath || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      // Limpiar la bandera antes de vincular: si el usuario ya inició sesión
      // con email/password y vincula Google, la sesión existente se mantiene.
      // linkIdentity añade Google como proveedor sin crear una cuenta nueva,
      // evitando cuentas duplicadas (problema de signInWithOAuth en este contexto).
      await supabase.from("profiles").update({ must_reset_password: false }).eq("id", user.id);
      const { error: linkErr } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (linkErr) throw linkErr;
      // linkIdentity redirige al proveedor; si llega aquí es un entorno sin redirect
    } catch (err) {
      console.warn("Error al vincular Google:", err);
      setError("No fue posible vincular con Google. Intenta de nuevo.");
      // Revertir si hubo error antes de redirigir
      await supabase.from("profiles").update({ must_reset_password: true }).eq("id", user.id).catch(() => {});
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background,#f8fafc)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div>
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Elige tu contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Por seguridad, debes establecer una contraseña personal antes de continuar.
            La contraseña temporal que recibiste quedará sin efecto.
          </p>
        </div>

        {/* Google option for Gmail users */}
        {isGmail && (
          <>
            <button
              onClick={handleGoogle}
              disabled={googleLoading || submitting}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {googleLoading ? (
                <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? "Redirigiendo..." : "Usar Google como método de acceso"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o elige una contraseña</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Nueva contraseña
            </label>
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
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Confirmar contraseña
            </label>
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
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || googleLoading || !password || !confirm}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-button-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Actualizando..." : "Establecer contraseña"}
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400">
          Tu contraseña debe tener al menos 8 caracteres, una mayúscula y un número.
        </p>
      </div>
    </div>
  );
}
