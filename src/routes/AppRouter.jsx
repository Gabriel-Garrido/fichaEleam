import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login         from "../features/auth/Login";
import Register      from "../features/auth/Register";
import LandingPage   from "../features/landing/LandingPage";
import DemoPage      from "../features/demo/DemoPage";
import PaymentPage   from "../features/payment/PaymentPage";
import PaymentReturn from "../features/payment/PaymentReturn";
import TeamManagement from "../features/team/TeamManagement";

import ResidentList    from "../features/residents/ResidentList";
import ResidentForm    from "../features/residents/ResidentForm";
import ResidentDetails from "../features/residents/ResidentDetails";

import VitalSignsList from "../features/vitalSigns/VitalSignsList";
import VitalSignsForm from "../features/vitalSigns/VitalSignsForm";

import ObservationList from "../features/observations/ObservationList";
import ObservationForm from "../features/observations/ObservationForm";

import AccreditationDashboard from "../features/accreditation/AccreditationDashboard";
import AccreditationCategory  from "../features/accreditation/AccreditationCategory";
import AccreditationUpload    from "../features/accreditation/AccreditationUpload";

import AdminDashboard      from "../features/dashboard/AdminDashboard";
import SuperAdminDashboard from "../features/superadmin/SuperAdminDashboard";

import FamiliarPortal  from "../features/familiar/FamiliarPortal";
import FamiliarVisitas from "../features/familiar/FamiliarVisitas";

import Navbar          from "../components/Navbar";
import ProtectedRoute  from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import Loading         from "../components/Loading";

const NO_NAVBAR_PATHS = ["/", "/login", "/register", "/demo", "/pago", "/pago/return"];

// Roles abreviados para legibilidad de las rutas
const STAFF = ["admin_eleam", "funcionario"];
const ADMIN = ["admin_eleam"];
const ADMIN_OR_STAFF = STAFF;

function AppRouter() {
  const { user, profileLoading, homePath } = useAuth();
  const { pathname }  = useLocation();
  const showNavbar    = !NO_NAVBAR_PATHS.includes(pathname);

  const signedInRedirect = profileLoading
    ? <Loading message="Verificando acceso..." />
    : <Navigate to={homePath} replace />;
  const fallbackPath = user ? homePath : "/";

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        {/* ── Públicas ──────────────────────────────────────── */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"       element={user ? signedInRedirect : <Login />} />
        <Route path="/register"    element={user ? signedInRedirect : <Register />} />
        <Route path="/demo"        element={<DemoPage />} />
        <Route path="/pago"        element={<PaymentPage />} />
        <Route path="/pago/return" element={<PaymentReturn />} />

        {/* ── Staff (admin_eleam + funcionario): operación clínica ─ */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="/residents" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ResidentList /></ProtectedRoute>
        } />
        <Route path="/residents/new" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ResidentForm /></ProtectedRoute>
        } />
        <Route path="/residents/:id" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ResidentDetails /></ProtectedRoute>
        } />
        <Route path="/residents/:id/edit" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ResidentForm /></ProtectedRoute>
        } />

        <Route path="/vital-signs" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><VitalSignsList /></ProtectedRoute>
        } />
        <Route path="/vital-signs/new" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><VitalSignsForm /></ProtectedRoute>
        } />

        <Route path="/observations" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ObservationList /></ProtectedRoute>
        } />
        <Route path="/observations/new" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><ObservationForm /></ProtectedRoute>
        } />

        <Route path="/accreditation" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationDashboard /></ProtectedRoute>
        } />
        <Route path="/accreditation/category/:id" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationCategory /></ProtectedRoute>
        } />
        <Route path="/accreditation/upload" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationUpload /></ProtectedRoute>
        } />

        {/* ── Solo admin del ELEAM ──────────────────────────────── */}
        <Route path="/equipo" element={
          <ProtectedRoute allowedRoles={ADMIN}><TeamManagement /></ProtectedRoute>
        } />

        {/* ── Familiar (sin requireActive: depende del ELEAM) ───── */}
        <Route path="/familiar" element={
          <ProtectedRoute allowedRoles={["familiar"]} requireActive={false}>
            <FamiliarPortal />
          </ProtectedRoute>
        } />
        <Route path="/familiar/visitas" element={
          <ProtectedRoute allowedRoles={["familiar"]} requireActive={false}>
            <FamiliarVisitas />
          </ProtectedRoute>
        } />

        {/* ── Superadmin ─────────────────────────────────────────── */}
        <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />

        {/* ── Fallback ───────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
    </>
  );
}

export default AppRouter;
