import ProtectedRoute from "./ProtectedRoute";

function SuperAdminRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={["superadmin"]}>
      {children}
    </ProtectedRoute>
  );
}

export default SuperAdminRoute;
