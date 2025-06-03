import React, { useState, useContext } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { login } from "./authService";
import { AuthContext } from "../../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

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

  console.log("Estado de usuario en AuthContext:", user);
  console.log("Estado de carga en AuthContext:", loading);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
        <div className="p-6 sm:p-12 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl shadow-2xl max-w-full sm:max-w-4xl text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
            Cargando...
          </h1>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" />; // Redirigir directamente al dashboard
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="p-6 sm:p-12 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl shadow-2xl transform transition duration-500 hover:scale-105 max-w-full sm:max-w-4xl text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
          Iniciar Sesión
        </h1>
        <form
          className="bg-white p-8 rounded shadow-md w-96"
          onSubmit={handleLogin}
        >
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Input
            type="email"
            placeholder="Correo Electrónico"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Contraseña"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="bg-[var(--color-primary)] text-white w-full hover:bg-[var(--color-button-hover)]">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
