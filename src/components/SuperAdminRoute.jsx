import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";

function SuperAdminRoute({ children }) {
  const { user, profile, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) return <Loading message="Verificando acceso..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.rol !== "superadmin") return <Navigate to="/dashboard" replace />;

  return children;
}

export default SuperAdminRoute;
