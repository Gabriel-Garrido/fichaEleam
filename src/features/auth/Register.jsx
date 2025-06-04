import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useLoading, useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";

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
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (!/[A-Z]/.test(password)) {
      return "La contraseña debe incluir al menos una letra mayúscula.";
    }
    if (!/[0-9]/.test(password)) {
      return "La contraseña debe incluir al menos un número.";
    }
    if (password !== confirmPassword) {
      return "Las contraseñas no coinciden.";
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        nombre: userData.nombre,
        email: userData.email,
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Error en el registro:", err);
      setError("No se pudo completar el registro. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <Loading message="Verificando autenticación..." />;
  }

  if (loading) {
    return <Loading message="Registrando usuario..." />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="p-8 sm:p-12 bg-white rounded-3xl shadow-lg max-w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-6">
          Registro
        </h1>
        <form className="space-y-6" onSubmit={handleRegister}>
          <Input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={userData.nombre}
            onChange={handleChange}
          />
          <Input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={userData.email}
            onChange={handleChange}
          />
          <Input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={userData.password}
            onChange={handleChange}
          />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            className="w-full border border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-secondary)] rounded-md px-4 py-2"
            value={userData.confirmPassword}
            onChange={handleChange}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-md hover:bg-[var(--color-button-hover)] transition-all duration-300"
          >
            Registrarse
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Register;
