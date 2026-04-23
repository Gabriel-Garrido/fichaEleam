import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) return <Loading message="Verificando sesión..." />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
