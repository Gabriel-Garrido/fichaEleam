import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell        from "../layout/AppShell";
import ProtectedRoute  from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import Loading         from "../components/Loading";

const Login = lazy(() => import("../features/auth/Login"));
const RecuperarAcceso = lazy(() => import("../features/auth/RecuperarAcceso"));
const ResetPassword = lazy(() => import("../features/auth/ResetPassword"));
const LandingPage = lazy(() => import("../features/landing/LandingPage"));
const AcreditacionSeremiPage = lazy(() => import("../features/public/AcreditacionSeremiPage"));
const SoftwareEleamPage = lazy(() => import("../features/public/SoftwareEleamPage"));
const FaqPage = lazy(() => import("../features/public/FaqPage"));
const ContactoPage = lazy(() => import("../features/public/ContactoPage"));
const PaymentPage = lazy(() => import("../features/payment/PaymentPage"));
const PaymentReturn = lazy(() => import("../features/payment/PaymentReturn"));
const TeamManagement = lazy(() => import("../features/team/TeamManagement"));
const ChangePasswordPage = lazy(() => import("../features/team/ChangePasswordPage"));

const ResidentList = lazy(() => import("../features/residents/ResidentList"));
const ResidentForm = lazy(() => import("../features/residents/ResidentForm"));
const ResidentDetails = lazy(() => import("../features/residents/ResidentDetails"));
const BedsPage = lazy(() => import("../features/beds/BedsPage"));
const VitalSignsList = lazy(() => import("../features/vitalSigns/VitalSignsList"));
const VitalSignsForm = lazy(() => import("../features/vitalSigns/VitalSignsForm"));
const ObservationList = lazy(() => import("../features/observations/ObservationList"));
const ObservationForm = lazy(() => import("../features/observations/ObservationForm"));

const TurnosDashboard = lazy(() => import("../features/turnos/TurnosDashboard"));
const TurnoBuilder = lazy(() => import("../features/turnos/TurnoBuilder"));
const TurnoPrintable = lazy(() => import("../features/turnos/TurnoPrintable"));
const CareTasksPage = lazy(() => import("../features/carePlans/CareTasksPage"));
const EmarTurnPage = lazy(() => import("../features/emar/EmarTurnPage"));

const AccreditationDashboard = lazy(() => import("../features/accreditation/AccreditationDashboard"));
const AccreditationAmbito = lazy(() => import("../features/accreditation/AccreditationAmbito"));
const AccreditationRequisito = lazy(() => import("../features/accreditation/AccreditationRequisito"));
const AccreditationObservaciones = lazy(() => import("../features/accreditation/AccreditationObservaciones"));
const AccreditationCarpeta = lazy(() => import("../features/accreditation/AccreditationCarpeta"));

const AdminDashboard = lazy(() => import("../features/dashboard/AdminDashboard"));
const SuperAdminDashboard = lazy(() => import("../features/superadmin/SuperAdminDashboard"));
const SuperAdminClientes = lazy(() => import("../features/superadmin/SuperAdminClientes"));
const SuperAdminLeads = lazy(() => import("../features/superadmin/SuperAdminLeads"));
const SuperAdminPagos = lazy(() => import("../features/superadmin/SuperAdminPagos"));
const SuperAdminTareas = lazy(() => import("../features/superadmin/SuperAdminTareas"));
const SuperAdminPermisos = lazy(() => import("../features/superadmin/SuperAdminPermisos"));
const BlogManagement = lazy(() => import("../features/superadmin/blog/BlogManagement"));
const BlogEditor = lazy(() => import("../features/superadmin/blog/BlogEditor"));

const FamiliarPortal = lazy(() => import("../features/familiar/FamiliarPortal"));
const FamiliarVisitas = lazy(() => import("../features/familiar/FamiliarVisitas"));
const PublicBlogList = lazy(() => import("../features/blog/PublicBlogList"));
const PublicBlogPost = lazy(() => import("../features/blog/PublicBlogPost"));

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
    <Suspense fallback={<Loading message="Cargando vista..." />}>
      <Routes>
        {/* ── Públicas ──────────────────────────────────────── */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"             element={user ? signedInRedirect : <Login />} />
        <Route path="/register"          element={<Navigate to="/login" replace />} />
        <Route path="/recuperar-acceso"  element={<RecuperarAcceso />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/pago"             element={user ? <AppShell><PaymentPage /></AppShell> : <PaymentPage />} />
        <Route path="/pago/return" element={<PaymentReturn />} />
        <Route path="/blog"        element={<PublicBlogList />} />
        <Route path="/blog/:slug"  element={<PublicBlogPost />} />
        <Route path="/acreditacion-seremi" element={<AcreditacionSeremiPage />} />
        <Route path="/software-eleam"     element={<SoftwareEleamPage />} />
        <Route path="/preguntas-frecuentes" element={<FaqPage />} />
        <Route path="/contacto"           element={<ContactoPage />} />

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
          <Route path="/turnos/tareas" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="care-plans"><CareTasksPage /></ProtectedRoute>
          } />
          <Route path="/turnos/emar" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="emar"><EmarTurnPage /></ProtectedRoute>
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

          <Route path="/camas" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="beds"><BedsPage /></ProtectedRoute>
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
    </Suspense>
  );
}

export default AppRouter;
