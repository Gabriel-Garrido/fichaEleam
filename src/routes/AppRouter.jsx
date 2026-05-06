import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login            from "../features/auth/Login";
import Register         from "../features/auth/Register";
import LandingPage      from "../features/landing/LandingPage";
import GuidedDemoPage  from "../features/demo/GuidedDemoPage";
import PaymentPage      from "../features/payment/PaymentPage";
import PaymentReturn    from "../features/payment/PaymentReturn";
import TeamManagement      from "../features/team/TeamManagement";
import ChangePasswordPage  from "../features/team/ChangePasswordPage";

import ResidentList    from "../features/residents/ResidentList";
import ResidentForm    from "../features/residents/ResidentForm";
import ResidentDetails from "../features/residents/ResidentDetails";

import VitalSignsList from "../features/vitalSigns/VitalSignsList";
import VitalSignsForm from "../features/vitalSigns/VitalSignsForm";

import ObservationList from "../features/observations/ObservationList";
import ObservationForm from "../features/observations/ObservationForm";

import AccreditationDashboard      from "../features/accreditation/AccreditationDashboard";
import AccreditationAmbito         from "../features/accreditation/AccreditationAmbito";
import AccreditationRequisito      from "../features/accreditation/AccreditationRequisito";
import AccreditationObservaciones  from "../features/accreditation/AccreditationObservaciones";
import AccreditationCarpeta        from "../features/accreditation/AccreditationCarpeta";

import AdminDashboard      from "../features/dashboard/AdminDashboard";
import SuperAdminDashboard from "../features/superadmin/SuperAdminDashboard";
import BlogManagement      from "../features/superadmin/blog/BlogManagement";
import BlogEditor          from "../features/superadmin/blog/BlogEditor";

import FamiliarPortal  from "../features/familiar/FamiliarPortal";
import FamiliarVisitas from "../features/familiar/FamiliarVisitas";

import PublicBlogList from "../features/blog/PublicBlogList";
import PublicBlogPost from "../features/blog/PublicBlogPost";

import Navbar          from "../components/Navbar";
import ProtectedRoute  from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import Loading         from "../components/Loading";

const NO_NAVBAR_PATHS_EXACT = new Set([
  "/", "/login", "/register",
  "/pago", "/pago/return",
  "/blog",
  "/cambiar-clave",
]);
const NO_NAVBAR_PREFIXES = ["/blog/", "/demo/"];

// Roles abreviados para legibilidad de las rutas
const STAFF = ["admin_eleam", "funcionario"];
const ADMIN = ["admin_eleam"];
const ADMIN_OR_STAFF = STAFF;

function AppRouter() {
  const { user, profileLoading, homePath } = useAuth();
  const { pathname }  = useLocation();
  const showNavbar    = !NO_NAVBAR_PATHS_EXACT.has(pathname)
    && !NO_NAVBAR_PREFIXES.some((p) => pathname.startsWith(p));

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
        <Route path="/demo/:token"      element={<GuidedDemoPage />} />
        <Route path="/pago"             element={<PaymentPage />} />
        <Route path="/pago/return" element={<PaymentReturn />} />
        <Route path="/blog"        element={<PublicBlogList />} />
        <Route path="/blog/:slug"  element={<PublicBlogPost />} />

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

        {/* Acreditación / Carpeta SEREMI: lectura para staff,
            gestión depende de cada acción (RLS + UI gating). */}
        <Route path="/accreditation" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationDashboard /></ProtectedRoute>
        } />
        <Route path="/accreditation/ambito/:codigo" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationAmbito /></ProtectedRoute>
        } />
        <Route path="/accreditation/requisito/:id" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationRequisito /></ProtectedRoute>
        } />
        <Route path="/accreditation/observaciones" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationObservaciones /></ProtectedRoute>
        } />
        <Route path="/accreditation/carpeta" element={
          <ProtectedRoute allowedRoles={ADMIN_OR_STAFF}><AccreditationCarpeta /></ProtectedRoute>
        } />

        {/* ── Cambio de contraseña obligatorio (primer acceso) ───── */}
        <Route path="/cambiar-clave" element={
          <ProtectedRoute requireActive={false}>
            <ChangePasswordPage />
          </ProtectedRoute>
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
        <Route path="/superadmin"          element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/superadmin/blog"     element={<SuperAdminRoute><BlogManagement /></SuperAdminRoute>} />
        <Route path="/superadmin/blog/new" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />
        <Route path="/superadmin/blog/:id/edit" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />

        {/* ── Fallback ───────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
    </>
  );
}

export default AppRouter;
