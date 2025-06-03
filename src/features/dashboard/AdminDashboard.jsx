import React from "react";
import ResidentStats from "./widgets/ResidentStats";
import NotificationsPanel from "./widgets/NotificationsPanel";

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="p-6 sm:p-12 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl shadow-2xl max-w-full sm:max-w-4xl text-center mx-auto">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
          Panel de Administración
        </h1>
        <p className="text-base sm:text-lg text-white mb-6 sm:mb-8">
          Bienvenido al panel de administración. Aquí puedes gestionar
          residentes, documentos y registros clínicos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
        <ResidentStats />
        <NotificationsPanel />
      </div>
    </div>
  );
}

export default AdminDashboard;
