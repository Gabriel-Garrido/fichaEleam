import React from "react";
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>; // Mostrar indicador de carga
  }

  if (!user) {
    return <Navigate to="/login" />; // Redirigir al login si no está autenticado
  }

  return children;
}

export default ProtectedRoute;
