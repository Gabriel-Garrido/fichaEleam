import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login        from "../features/auth/Login";
import Register     from "../features/auth/Register";
import LandingPage  from "../features/landing/LandingPage";
import DemoPage     from "../features/demo/DemoPage";
import PaymentPage  from "../features/payment/PaymentPage";

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

import AdminDashboard  from "../features/dashboard/AdminDashboard";
import Navbar          from "../components/Navbar";
import ProtectedRoute  from "../components/ProtectedRoute";

// Rutas donde NO se muestra el Navbar global (tienen su propio header)
const NO_NAVBAR_PATHS = ["/", "/demo", "/pago"];

function AppRouter() {
  const { user }   = useAuth();
  const { pathname } = useLocation();
  const showNavbar = !NO_NAVBAR_PATHS.includes(pathname);

  return (
    <>
      {showNavbar && <Navbar isLoggedIn={!!user} />}
      <Routes>
        {/* ── Públicas ──────────────────────────────────────── */}
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/demo"  element={<DemoPage />} />
        <Route path="/pago"  element={<PaymentPage />} />

        {/* ── Protegidas (requieren sesión + pago activo) ──── */}
        <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        <Route path="/residents"          element={<ProtectedRoute><ResidentList /></ProtectedRoute>} />
        <Route path="/residents/new"      element={<ProtectedRoute><ResidentForm /></ProtectedRoute>} />
        <Route path="/residents/:id"      element={<ProtectedRoute><ResidentDetails /></ProtectedRoute>} />
        <Route path="/residents/:id/edit" element={<ProtectedRoute><ResidentForm /></ProtectedRoute>} />

        <Route path="/vital-signs"     element={<ProtectedRoute><VitalSignsList /></ProtectedRoute>} />
        <Route path="/vital-signs/new" element={<ProtectedRoute><VitalSignsForm /></ProtectedRoute>} />

        <Route path="/observations"     element={<ProtectedRoute><ObservationList /></ProtectedRoute>} />
        <Route path="/observations/new" element={<ProtectedRoute><ObservationForm /></ProtectedRoute>} />

        <Route path="/accreditation"                  element={<ProtectedRoute><AccreditationDashboard /></ProtectedRoute>} />
        <Route path="/accreditation/category/:id"     element={<ProtectedRoute><AccreditationCategory /></ProtectedRoute>} />
        <Route path="/accreditation/upload"           element={<ProtectedRoute><AccreditationUpload /></ProtectedRoute>} />

        {/* ── Fallback ──────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default AppRouter;
