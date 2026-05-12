import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login            from "../features/auth/Login";
import Register         from "../features/auth/Register";
import RecuperarAcceso  from "../features/auth/RecuperarAcceso";
import ResetPassword    from "../features/auth/ResetPassword";
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

import TurnosDashboard from "../features/turnos/TurnosDashboard";
import TurnoBuilder from "../features/turnos/TurnoBuilder";
import TurnoPrintable from "../features/turnos/TurnoPrintable";

import AccreditationDashboard      from "../features/accreditation/AccreditationDashboard";
import AccreditationAmbito         from "../features/accreditation/AccreditationAmbito";
import AccreditationRequisito      from "../features/accreditation/AccreditationRequisito";
import AccreditationObservaciones  from "../features/accreditation/AccreditationObservaciones";
import AccreditationCarpeta        from "../features/accreditation/AccreditationCarpeta";

import AdminDashboard      from "../features/dashboard/AdminDashboard";
import SuperAdminDashboard from "../features/superadmin/SuperAdminDashboard";
import SuperAdminClientes  from "../features/superadmin/SuperAdminClientes";
import SuperAdminLeads     from "../features/superadmin/SuperAdminLeads";
import SuperAdminPagos     from "../features/superadmin/SuperAdminPagos";
import SuperAdminTareas    from "../features/superadmin/SuperAdminTareas";
import SuperAdminPermisos  from "../features/superadmin/SuperAdminPermisos";
import BlogManagement      from "../features/superadmin/blog/BlogManagement";
import BlogEditor          from "../features/superadmin/blog/BlogEditor";

import FamiliarPortal  from "../features/familiar/FamiliarPortal";
import FamiliarVisitas from "../features/familiar/FamiliarVisitas";

import PublicBlogList from "../features/blog/PublicBlogList";
import PublicBlogPost from "../features/blog/PublicBlogPost";

import AppShell        from "../layout/AppShell";
import ProtectedRoute  from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import Loading         from "../components/Loading";

// Roles abreviados para legibilidad de las rutas
const STAFF = ["admin_eleam", "funcionario"];
const ADMIN = ["admin_eleam"];
const ADMIN_OR_STAFF = STAFF;

function AppRouter() {
  const { user, profileLoading, homePath } = useAuth();

  const signedInRedirect = profileLoading
    ? <Loading message="Verificando acceso..." />
    : <Navigate to={homePath} replace />;
  const fallbackPath = user ? homePath : "/";

  return (
    <Routes>
        {/* ── Públicas ──────────────────────────────────────── */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"             element={user ? signedInRedirect : <Login />} />
        <Route path="/register"          element={user ? signedInRedirect : <Register />} />
        <Route path="/recuperar-acceso"  element={<RecuperarAcceso />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/demo/:token"      element={<GuidedDemoPage />} />
        <Route path="/pago"             element={user ? <AppShell><PaymentPage /></AppShell> : <PaymentPage />} />
        <Route path="/pago/return" element={<PaymentReturn />} />
        <Route path="/blog"        element={<PublicBlogList />} />
        <Route path="/blog/:slug"  element={<PublicBlogPost />} />

        {/* ── Cambio de contraseña obligatorio (primer acceso) ───── */}
        <Route path="/cambiar-clave" element={
          <ProtectedRoute requireActive={false}>
            <ChangePasswordPage />
          </ProtectedRoute>
        } />

        {/* ── App autenticada: shell moderno por rol ─────────────── */}
        <Route element={<AppShell />}>
          {/* Staff (admin_eleam + funcionario): operación clínica */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="dashboard"><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="/turnos" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="turnos"><TurnosDashboard /></ProtectedRoute>
          } />
          <Route path="/turnos/nueva" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="turnos"><TurnoBuilder /></ProtectedRoute>
          } />
          <Route path="/turnos/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="turnos"><TurnoPrintable /></ProtectedRoute>
          } />

          <Route path="/residents" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ResidentList /></ProtectedRoute>
          } />
          <Route path="/residents/new" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ResidentForm /></ProtectedRoute>
          } />
          <Route path="/residents/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ResidentDetails /></ProtectedRoute>
          } />
          <Route path="/residents/:id/edit" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ResidentForm /></ProtectedRoute>
          } />

          <Route path="/vital-signs" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="vital-signs"><VitalSignsList /></ProtectedRoute>
          } />
          <Route path="/vital-signs/new" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="vital-signs"><VitalSignsForm /></ProtectedRoute>
          } />

          <Route path="/observations" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="observations"><ObservationList /></ProtectedRoute>
          } />
          <Route path="/observations/new" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="observations"><ObservationForm /></ProtectedRoute>
          } />

          {/* Acreditación / Carpeta SEREMI: lectura para staff,
              gestión depende de cada acción (RLS + UI gating). */}
          <Route path="/accreditation" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="accreditation"><AccreditationDashboard /></ProtectedRoute>
          } />
          <Route path="/accreditation/ambito/:codigo" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="accreditation"><AccreditationAmbito /></ProtectedRoute>
          } />
          <Route path="/accreditation/requisito/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="accreditation"><AccreditationRequisito /></ProtectedRoute>
          } />
          <Route path="/accreditation/observaciones" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="accreditation"><AccreditationObservaciones /></ProtectedRoute>
          } />
          <Route path="/accreditation/carpeta" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="accreditation"><AccreditationCarpeta /></ProtectedRoute>
          } />

          {/* Solo admin del ELEAM */}
          <Route path="/equipo" element={
            <ProtectedRoute allowedRoles={ADMIN} requiredFeature="team"><TeamManagement /></ProtectedRoute>
          } />

          {/* Familiar: acceso solo si el ELEAM mantiene acceso vigente */}
          <Route path="/familiar" element={
            <ProtectedRoute allowedRoles={["familiar"]} requiredFeature="familiar">
              <FamiliarPortal />
            </ProtectedRoute>
          } />
          <Route path="/familiar/visitas" element={
            <ProtectedRoute allowedRoles={["familiar"]} requiredFeature="familiar-visitas">
              <FamiliarVisitas />
            </ProtectedRoute>
          } />

          {/* Superadmin */}
          <Route path="/superadmin"          element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
          <Route path="/superadmin/clientes" element={<SuperAdminRoute><SuperAdminClientes /></SuperAdminRoute>} />
          <Route path="/superadmin/leads"    element={<SuperAdminRoute><SuperAdminLeads /></SuperAdminRoute>} />
          <Route path="/superadmin/pagos"    element={<SuperAdminRoute><SuperAdminPagos /></SuperAdminRoute>} />
          <Route path="/superadmin/tareas"   element={<SuperAdminRoute><SuperAdminTareas /></SuperAdminRoute>} />
          <Route path="/superadmin/permisos" element={<SuperAdminRoute><SuperAdminPermisos /></SuperAdminRoute>} />
          <Route path="/superadmin/blog"     element={<SuperAdminRoute><BlogManagement /></SuperAdminRoute>} />
          <Route path="/superadmin/blog/new" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />
          <Route path="/superadmin/blog/:id/edit" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />
        </Route>

        {/* ── Fallback ───────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
  );
}

export default AppRouter;
