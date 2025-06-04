import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";
import Input from "../../components/Input";
import Button from "../../components/Button";

function RegisterAdmin() {
  const [adminData, setAdminData] = useState({
    nombre: "",
    email: "",
    password: "",
    eleamNombre: "",
    direccion: "",
    comuna: "",
    region: "",
    telefono: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdminData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminData.email,
        adminData.password
      );
      const { uid } = userCredential.user;

      // Crear documento en Firestore para el usuario
      const eleamId = `eleam_${Date.now()}`;
      await setDoc(doc(db, "usuarios", uid), {
        nombre: adminData.nombre,
        email: adminData.email,
        rol: "admin",
        eleamId,
        creadoEn: new Date().toISOString(),
      });

      // Crear documento en Firestore para el ELEAM
      await setDoc(doc(db, "eleam", eleamId), {
        nombre: adminData.eleamNombre,
        direccion: adminData.direccion,
        comuna: adminData.comuna,
        region: adminData.region,
        telefono: adminData.telefono,
        creadoPor: adminData.email,
      });

      navigate("/login");
    } catch (err) {
      console.error("Error al registrar administrador:", err);
      setError("No se pudo crear la cuenta. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="p-6 sm:p-12 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl shadow-2xl max-w-full sm:max-w-4xl text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
          Crear Cuenta de Administrador
        </h1>
        <form
          className="bg-white p-8 rounded shadow-md w-96"
          onSubmit={handleRegister}
        >
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Input
            type="text"
            name="nombre"
            placeholder="Nombre Completo"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.nombre}
            onChange={handleChange}
          />
          <Input
            type="email"
            name="email"
            placeholder="Correo Electrónico"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.email}
            onChange={handleChange}
          />
          <Input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.password}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="eleamNombre"
            placeholder="Nombre del ELEAM"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.eleamNombre}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="direccion"
            placeholder="Dirección"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.direccion}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="comuna"
            placeholder="Comuna"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.comuna}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="region"
            placeholder="Región"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.region}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="telefono"
            placeholder="Teléfono"
            className="mb-4 w-full border border-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
            value={adminData.telefono}
            onChange={handleChange}
          />
          <Button
            className="bg-[var(--color-primary)] text-white w-full hover:bg-[var(--color-button-hover)]"
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear Cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default RegisterAdmin;
