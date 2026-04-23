import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useLoading, useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";
import { register } from "./authService";
import { validateEmail } from "../../utils/validators";

function Register() {
  const [userData, setUserData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const { loading, setLoading } = useLoading();
  const { authLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const validatePassword = () => {
    const { password, confirmPassword } = userData;
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(password)) return "La contraseña debe incluir al menos una letra mayúscula.";
    if (!/[0-9]/.test(password)) return "La contraseña debe incluir al menos un número.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateEmail(userData.email)) {
      setError("El correo electrónico no es válido.");
      return;
    }
    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      await register({
        nombre: userData.nombre,
        email: userData.email,
        password: userData.password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "No se pudo completar el registro. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <Loading message="Procesando..." />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="p-8 sm:p-12 bg-white rounded-3xl shadow-lg max-w-full sm:max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-6">Registro</h1>
        <form className="space-y-6" onSubmit={handleRegister}>
          <Input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={userData.nombre}
            onChange={handleChange}
            required
          />
          <Input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={userData.email}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={userData.password}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            value={userData.confirmPassword}
            onChange={handleChange}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-md hover:bg-[var(--color-button-hover)] transition-all duration-300"
          >
            Registrarse
          </Button>
        </form>
        <p className="text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{" "}
          <span
            className="text-[var(--color-primary)] cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Inicia sesión
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;
