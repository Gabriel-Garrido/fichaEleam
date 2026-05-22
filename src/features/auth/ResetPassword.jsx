import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
  authErrorMessage,
  continueWithGoogleForActivation,
  getCurrentAuthSession,
  isAuthConfigured,
  logout,
  subscribePasswordRecovery,
  updatePasswordAndClearResetFlag,
} from "./authService";
import { validatePassword } from "../../utils/passwordValidation";

function strengthLabel(pw) {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const long     = pw.length >= 8;
  const veryLong = pw.length >= 12;
  const score    = [hasUpper, hasNum, long, veryLong].filter(Boolean).length;
  if (score <= 1) return { txt: "Débil",   cls: "bg-rose-500",    bar: "w-1/4" };
  if (score === 2) return { txt: "Regular", cls: "bg-amber-400",  bar: "w-2/4" };
  if (score === 3) return { txt: "Buena",   cls: "bg-sky-500",    bar: "w-3/4" };
  return              { txt: "Muy fuerte", cls: "bg-emerald-500", bar: "w-full" };
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [done, setDone]           = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired]   = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [configError] = useState(!isAuthConfigured());

  const strength = strengthLabel(password);

  useEffect(() => {
    if (!isAuthConfigured()) return;

    const paramsFromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const paramsFromSearch = new URLSearchParams(window.location.search);
    const urlError = paramsFromHash.get("error_description") ||
      paramsFromHash.get("error") ||
      paramsFromSearch.get("error_description") ||
      paramsFromSearch.get("error");

    if (urlError) {
      setLinkError(authErrorMessage({ message: urlError }, "El link de recuperación no es válido o expiró."));
      setLinkExpired(true);
      return;
    }

    let cancelled = false;
    let timer;
    let interval;
    const markReady = () => {
      if (cancelled) return;
      setSessionReady(true);
      setLinkExpired(false);
      setLinkError(null);
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };

    // Supabase puede entregar el reset como PASSWORD_RECOVERY, SIGNED_IN o
    // sesión ya persistida, según el tipo de link y el momento de montaje.
    const unsubscribe = subscribePasswordRecovery((session) => {
      if (session) markReady();
    });

    const checkSession = () => {
      getCurrentAuthSession()
        .then((session) => {
          if (session) markReady();
        })
        .catch(() => {});
    };
    checkSession();
    interval = setInterval(checkSession, 500);

    timer = setTimeout(() => {
      if (!cancelled) {
        setLinkExpired(true);
        setLinkError("No pudimos validar la sesión del link. Solicita un nuevo link e inténtalo nuevamente.");
      }
      if (interval) clearInterval(interval);
    }, 8000);

    return () => {
      cancelled = true;
      unsubscribe();
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isAuthConfigured()) {
      setError("Supabase no está configurado.");
      return;
    }
    const pwError = validatePassword(password, confirm);
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      await updatePasswordAndClearResetFlag(password);
      await logout().catch((signOutError) => {
        console.warn("No se pudo cerrar la sesión temporal de recuperación:", signOutError);
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(authErrorMessage(err, err.message || "No se pudo actualizar la contraseña."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await continueWithGoogleForActivation({
        redirectTo: `${window.location.origin}/cambiar-clave?linked=google`,
      });
    } catch (err) {
      console.warn("Error al iniciar/vincular Google:", err);
      setError(authErrorMessage(err, "No pudimos iniciar con Google. Puedes crear una contraseña para continuar."));
      setGoogleLoading(false);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Supabase no configurado</h2>
          <p className="text-sm text-slate-500">No es posible restablecer contraseñas hasta configurar las variables de entorno.</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          {linkExpired ? (
            <>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Link inválido o expirado</h2>
              <p className="text-sm text-slate-500">
                {linkError || "Este link de recuperación ya no es válido. Los links expiran en 1 hora."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/recuperar-acceso")}
                className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
              >
                Solicitar nuevo link
              </button>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {googleLoading ? (
                  <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? "Redirigiendo..." : "Entrar con Google"}
              </button>
              <button type="button"
 onClick={() => navigate("/login")} className="text-sm text-slate-400 hover:text-slate-600">
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
              <p className="text-slate-600 text-sm">Verificando link de recuperación...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Contraseña actualizada</h1>
          <p className="text-sm text-slate-500">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
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
          <h1 className="text-2xl font-bold text-slate-800">Nueva contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">Elige una contraseña segura o vincula tu cuenta de Google.</p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || submitting}
          className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {googleLoading ? (
            <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Redirigiendo..." : "Entrar con Google"}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">o crea contraseña</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${strength.cls} ${strength.bar}`} />
                </div>
                <p className="text-xs text-slate-500">{strength.txt}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar contraseña</label>
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={submitting}
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
            disabled={submitting || !password || !confirm}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Guardando..." : "Establecer nueva contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
