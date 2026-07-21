import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import AreaCard from "../../components/AreaCard";

export default function PersonnelPage() {
  const { isAdminEleam, isSuperadmin } = useAuth();
  const canManageUsers = isAdminEleam || isSuperadmin;

  return (
    <PageLayout
      eyebrow="Dirección y personal"
      title="Personal"
      description="Gestiona nómina, competencias, capacitación y cobertura de turnos desde una sola área."
      coachFeatureId="personnel"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AreaCard
          eyebrow="Paso 1"
          title="Equipo y accesos"
          description={canManageUsers ? "Invita personas y revisa quién puede ingresar al sistema." : "Consulta quién integra el equipo."}
          path="/personal/equipo"
          icon="team"
        />
        <AreaCard
          eyebrow="Paso 2 · DS 20"
          title="Antecedentes SEREMI"
          description="Registra cargo, función, competencias y avance de las 22 horas anuales."
          path="/personal/antecedentes"
          icon="compliance"
          tone="amber"
        />
        <AreaCard
          eyebrow="Paso 3 · Artículos 15 al 17"
          title="Planificar dotación"
          description="Asigna el equipo de cada día y detecta automáticamente si faltan cuidadores."
          path="/personal/dotacion"
          icon="staffing"
          tone="violet"
        />
        <AreaCard
          eyebrow="Uso diario"
          title="Entregar turno"
          description="Deja al siguiente equipo sólo alertas, novedades y pendientes importantes."
          path="/operacion/turnos"
          icon="shift"
        />
      </div>
    </PageLayout>
  );
}
