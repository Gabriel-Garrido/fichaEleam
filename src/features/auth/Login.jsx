import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { authErrorMessage, login, loginWithGoogle } from "./authService";
import { useAuth, useLoading } from "../../context/AuthContext";
import { isSupabaseConfigured, supabaseConfigError } from "../../services/supabaseConfig";
import Loading from "../../components/Loading";
import Input from "../../components/Input";
import Button from "../../components/Button";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function SinSupabase() {
  const navigate = useNavigate();
  const message = supabaseConfigError === "invalid-url"
    ? "La URL de Supabase no tiene un formato válido. Revisa VITE_SUPABASE_URL en tu archivo .env."
    : "El inicio de sesión requiere conexión a la base de datos. Configura las variables de entorno para activar esta función.";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <WrenchIcon />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Supabase no configurado</h2>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate   = useNavigate();
  const { authLoading, profileLoading, user, supabaseError, authNotice, homePath } = useAuth();
  const { loading, setLoading } = useLoading();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Evitar flash del formulario durante el callback de Google OAuth.
  // Se detecta si hay token en el hash (callback de OAuth); se limpia
  // cuando authLoading termina para no bloquear la redirección al homePath.
  const hasOauthHash = typeof window !== "undefined" &&
    (window.location.hash.includes("access_token") ||
     window.location.hash.includes("error_description"));
  const [oauthPending, setOauthPending] = useState(hasOauthHash);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setError(authErrorMessage({ message: oauthError }, "No encontramos una cuenta habilitada para ese correo."));
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setOauthPending(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) setOauthPending(false);
  }, [authLoading]);

  if (authLoading || loading || oauthPending) return <Loading message="Verificando autenticación..." />;
  if (user && !profileLoading) return <Navigate to={homePath} replace />;
  if (!isSupabaseConfigured) return <SinSupabase />;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      console.warn("Error de login:", err);
      setError(authErrorMessage(err, "No pudimos iniciar sesión. Revisa tus datos o intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.warn("Error de Google OAuth:", err);
      setError(authErrorMessage(err, "Google no respondió como esperábamos. Intenta otra vez en unos segundos."));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="mb-6 text-center">
        <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
          FichaEleam
        </button>
        <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Bienvenido de vuelta</h1>
        <p className="text-sm text-slate-500 mb-6">
          Ingresa solo si tu cuenta ya fue habilitada por FichaEleam o por tu ELEAM.
        </p>

        {(supabaseError || authNotice) && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {authNotice || "La conexión con Supabase está tardando más de lo habitual. Puedes intentar iniciar sesión nuevamente."}
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-5 disabled:opacity-50"
        >
          {googleLoading ? (
            <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
        </button>
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-5">
          Google no crea cuentas nuevas. Solo funciona si ese correo ya fue aprobado para demo,
          tiene un ELEAM vigente o fue creado como funcionario/familiar.
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">o con correo</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
            <Input
              type="email"
              name="email"
              placeholder="tu@email.cl"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600">Contraseña</label>
              <Link
                to="/recuperar-acceso"
                className="text-xs text-teal-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          </div>

          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
          >
            Iniciar sesión
          </Button>
        </form>

        {/* Orientación por tipo de usuario */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">Funcionario o familiar</p>
            <p className="text-sm text-slate-600">
              Usa el correo y contraseña que te entregó el administrador o funcionario autorizado de tu ELEAM. Si luego vinculas Google, debe ser el mismo correo.
            </p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">Administrador nuevo</p>
              <p className="text-sm text-slate-600">¿Quieres digitalizar tu ELEAM?</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="shrink-0 text-sm bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-800 transition-colors"
            >
              Solicitar demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
