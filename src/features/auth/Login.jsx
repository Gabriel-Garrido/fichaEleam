import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { login, loginWithGoogle } from "./authService";
import { useAuth, useLoading } from "../../context/AuthContext";
import { isSupabaseConfigured } from "../../services/supabaseConfig";
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

function SinSupabase() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="text-4xl mb-4">🔧</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Supabase no configurado</h2>
        <p className="text-gray-500 text-sm mb-6">
          El inicio de sesión requiere conexión a la base de datos. Configura las
          variables de entorno para activar esta función.
        </p>
        <button
          onClick={() => navigate("/demo")}
          className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-button-hover)] transition-colors"
        >
          Explorar el demo sin conexión
        </button>
        <Link to="/" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate   = useNavigate();
  const { authLoading, user } = useAuth();
  const { loading, setLoading } = useLoading();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (authLoading || loading) return <Loading message="Verificando autenticación..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  if (!isSupabaseConfigured) return <SinSupabase />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch {
      setError("Correo o contraseña incorrectos. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // La redirección la maneja Supabase OAuth (va a /dashboard)
    } catch {
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4 py-10">
      {/* Logo / Brand */}
      <div className="mb-6 text-center">
        <button onClick={() => navigate("/")} className="text-2xl font-black text-[var(--color-primary)] tracking-tight">
          FichaEleam
        </button>
        <p className="text-sm text-gray-500 mt-1">Plataforma para ELEAM</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido de vuelta</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresa a tu cuenta para continuar</p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-5 disabled:opacity-50"
        >
          {googleLoading ? (
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">o con correo</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Formulario email */}
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
            <Input
              type="email"
              name="email"
              placeholder="tu@email.cl"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-button-hover)] transition-colors"
          >
            Iniciar sesión
          </Button>
        </form>

        {/* Demo CTA — prominente */}
        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
          <p className="text-sm text-teal-800 font-medium mb-2">¿Quieres ver cómo funciona antes de registrarte?</p>
          <button
            onClick={() => navigate("/demo")}
            className="text-sm bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[var(--color-button-hover)] transition-colors"
          >
            Explorar demo sin registrarme
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          ¿Aún no tienes cuenta?{" "}
          <button onClick={() => navigate("/pago")} className="text-[var(--color-primary)] font-semibold hover:underline">
            Activar mi ELEAM
          </button>
        </p>
      </div>
    </div>
  );
}
