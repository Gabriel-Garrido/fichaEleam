import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { login } from "./authService";
import { useLoading, useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { loading, setLoading } = useLoading();
  const { authLoading, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email, password });
      console.log("Usuario logueado:", user);
      navigate("/dashboard"); // Redirige al dashboard
    } catch (err) {
      console.error("Error en el login:", err);
      setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <Loading message="Verificando autenticación..." />;
  }

  if (loading) {
    return <Loading message="Iniciando sesión..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" />; // Redirigir directamente al dashboard
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="p-8 sm:p-12 bg-white rounded-3xl shadow-lg max-w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-6">
          Iniciar Sesión
        </h1>
        <form className="space-y-6" onSubmit={handleLogin}>
          <Input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-md hover:bg-[var(--color-button-hover)] transition-all duration-300"
          >
            Iniciar Sesión
          </Button>
        </form>
        <p className="text-sm text-gray-500 mt-4">
          ¿No tienes una cuenta?{" "}
          <span
            className="text-[var(--color-primary)] cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Regístrate
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
