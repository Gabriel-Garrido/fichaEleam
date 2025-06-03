import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import ResidentList from "../features/residents/ResidentList";
import ResidentForm from "../features/residents/ResidentForm";
import ResidentDetails from "../features/residents/ResidentDetails";
import ClinicalRecordList from "../features/clinicalRecords/ClinicalRecordList";
import ClinicalRecordForm from "../features/clinicalRecords/ClinicalRecordForm";
import ClinicalRecordDetails from "../features/clinicalRecords/ClinicalRecordDetails";
import DocumentUpload from "../features/documents/DocumentUpload";
import DocumentList from "../features/documents/DocumentList";
import AdminDashboard from "../features/dashboard/AdminDashboard";
import ResidentDashboard from "../features/dashboard/ResidentDashboard";
import Navbar from "../components/Navbar";
import LandingPage from "../features/landing/LandingPage";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRouter() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>; // Mostrar un indicador de carga mientras se verifica el estado de autenticación
  }

  return (
    <>
      <Navbar isLoggedIn={!!user} />{" "}
      {/* Renderiza Navbar para todos los usuarios */}
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <LandingPage />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/residents"
          element={
            <ProtectedRoute>
              <ResidentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents/new"
          element={
            <ProtectedRoute>
              <ResidentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents/:id"
          element={
            <ProtectedRoute>
              <ResidentDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-records"
          element={
            <ProtectedRoute>
              <ClinicalRecordList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-records/new"
          element={
            <ProtectedRoute>
              <ClinicalRecordForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-records/:id"
          element={
            <ProtectedRoute>
              <ClinicalRecordDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/upload"
          element={
            <ProtectedRoute>
              <DocumentUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/resident"
          element={
            <ProtectedRoute>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident-dashboard"
          element={
            <ProtectedRoute>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default AppRouter;
