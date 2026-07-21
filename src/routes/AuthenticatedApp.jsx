import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import AppShell from "../layout/AppShell";
import ProtectedRoute from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import Loading from "../components/Loading";

const Login = lazy(() => import("../features/auth/Login"));
const RecuperarAcceso = lazy(() => import("../features/auth/RecuperarAcceso"));
const ResetPassword = lazy(() => import("../features/auth/ResetPassword"));
const PaymentPage = lazy(() => import("../features/payment/PaymentPage"));
const PaymentReturn = lazy(() => import("../features/payment/PaymentReturn"));
const StaffDirectory = lazy(() => import("../features/team/StaffDirectory"));
const ChangePasswordPage = lazy(() => import("../features/team/ChangePasswordPage"));
const EstablishmentPage = lazy(() => import("../features/establishment/EstablishmentPage"));
const PersonnelPage = lazy(() => import("../features/personnel/PersonnelPage"));
const ComplianceHub = lazy(() => import("../features/compliance/ComplianceHub"));

const ResidentList = lazy(() => import("../features/residents/ResidentList"));
const ResidentForm = lazy(() => import("../features/residents/ResidentForm"));
const ResidentDetails = lazy(() => import("../features/residents/ResidentDetails"));
const BedsPage = lazy(() => import("../features/beds/BedsPage"));
const VitalSignsList = lazy(() => import("../features/vitalSigns/VitalSignsList"));
const VitalSignsForm = lazy(() => import("../features/vitalSigns/VitalSignsForm"));
const ObservationList = lazy(() => import("../features/observations/ObservationList"));
const ObservationForm = lazy(() => import("../features/observations/ObservationForm"));
const AdverseEventsList = lazy(() => import("../features/adverseEvents/AdverseEventsList"));
const AdverseEventForm = lazy(() => import("../features/adverseEvents/AdverseEventForm"));
const AdverseEventDetail = lazy(() => import("../features/adverseEvents/AdverseEventDetail"));

const TurnosDashboard = lazy(() => import("../features/turnos/TurnosDashboard"));
const TurnoBuilder = lazy(() => import("../features/turnos/TurnoBuilder"));
const TurnoPrintable = lazy(() => import("../features/turnos/TurnoPrintable"));
const CareTasksPage = lazy(() => import("../features/carePlans/CareTasksPage"));
const EmarTurnPage = lazy(() => import("../features/emar/EmarTurnPage"));
const StaffingPage = lazy(() => import("../features/ds20/StaffingPage"));

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
const BlogManagement = lazy(() => import("../features/superadmin/blog/BlogManagement"));
const BlogEditor = lazy(() => import("../features/superadmin/blog/BlogEditor"));

const EmergenciasPage = lazy(() => import("../features/emergencias/EmergenciasPage"));
const ReclamosPage = lazy(() => import("../features/reclamos/ReclamosPage"));
const CumplimientoPage = lazy(() => import("../features/cumplimiento/CumplimientoPage"));

const STAFF = ["admin_eleam", "funcionario"];
const ADMIN = ["admin_eleam"];
const ADMIN_OR_STAFF = STAFF;

function AuthenticatedRoutes() {
  const { user, profileLoading, homePath } = useAuth();

  const signedInRedirect = profileLoading
    ? <Loading message="Verificando acceso..." />
    : <Navigate to={homePath} replace />;
  const fallbackPath = user ? homePath : "/";

  return (
    <Suspense fallback={<Loading message="Cargando vista..." />}>
      <Routes>
        <Route path="/login" element={user ? signedInRedirect : <Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/recuperar-acceso" element={<RecuperarAcceso />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pago" element={user ? <AppShell><PaymentPage /></AppShell> : <PaymentPage />} />
        <Route path="/pago/return" element={<PaymentReturn />} />

        <Route path="/cambiar-clave" element={
          <ProtectedRoute requireActive={false}>
            <ChangePasswordPage />
          </ProtectedRoute>
        } />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="dashboard"><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="/establecimiento" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="establishment"><EstablishmentPage /></ProtectedRoute>
          } />
          <Route path="/establecimiento/camas" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="establishment"><BedsPage /></ProtectedRoute>
          } />

          <Route path="/personal" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="personnel"><PersonnelPage /></ProtectedRoute>
          } />
          <Route path="/personal/equipo" element={
            <ProtectedRoute allowedRoles={ADMIN} requiredFeature="personnel"><StaffDirectory /></ProtectedRoute>
          } />
          <Route path="/personal/dotacion" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="personnel"><StaffingPage /></ProtectedRoute>
          } />

          <Route path="/cumplimiento" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><ComplianceHub /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/obligaciones" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><CumplimientoPage /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/emergencias" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><EmergenciasPage /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/reclamos" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><ReclamosPage /></ProtectedRoute>
          } />

          <Route path="/operacion/turnos" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><TurnosDashboard /></ProtectedRoute>
          } />
          <Route path="/operacion/turnos/nuevo" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><TurnoBuilder /></ProtectedRoute>
          } />
          <Route path="/operacion/cuidados" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><CareTasksPage /></ProtectedRoute>
          } />
          <Route path="/operacion/medicamentos" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><EmarTurnPage /></ProtectedRoute>
          } />
          <Route path="/operacion/turnos/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><TurnoPrintable /></ProtectedRoute>
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
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><VitalSignsList /></ProtectedRoute>
          } />
          <Route path="/vital-signs/new" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><VitalSignsForm /></ProtectedRoute>
          } />

          <Route path="/observations" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ObservationList /></ProtectedRoute>
          } />
          <Route path="/observations/new" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><ObservationForm /></ProtectedRoute>
          } />

          <Route path="/eventos-adversos" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><AdverseEventsList /></ProtectedRoute>
          } />
          <Route path="/eventos-adversos/nuevo" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><AdverseEventForm /></ProtectedRoute>
          } />
          <Route path="/eventos-adversos/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><AdverseEventDetail /></ProtectedRoute>
          } />
          <Route path="/eventos-adversos/:id/edit" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="residents"><AdverseEventForm /></ProtectedRoute>
          } />

          <Route path="/cumplimiento/seremi" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><AccreditationDashboard /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/seremi/ambito/:codigo" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><AccreditationAmbito /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/seremi/requisito/:id" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><AccreditationRequisito /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/seremi/observaciones" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><AccreditationObservaciones /></ProtectedRoute>
          } />
          <Route path="/cumplimiento/seremi/carpeta" element={
            <ProtectedRoute allowedRoles={ADMIN_OR_STAFF} requiredFeature="compliance"><AccreditationCarpeta /></ProtectedRoute>
          } />

          <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
          <Route path="/superadmin/clientes" element={<SuperAdminRoute><SuperAdminClientes /></SuperAdminRoute>} />
          <Route path="/superadmin/leads" element={<SuperAdminRoute><SuperAdminLeads /></SuperAdminRoute>} />
          <Route path="/superadmin/pagos" element={<SuperAdminRoute><SuperAdminPagos /></SuperAdminRoute>} />
          <Route path="/superadmin/tareas" element={<SuperAdminRoute><SuperAdminTareas /></SuperAdminRoute>} />
          <Route path="/superadmin/blog" element={<SuperAdminRoute><BlogManagement /></SuperAdminRoute>} />
          <Route path="/superadmin/blog/new" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />
          <Route path="/superadmin/blog/:id/edit" element={<SuperAdminRoute><BlogEditor /></SuperAdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function AuthenticatedApp() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  );
}
