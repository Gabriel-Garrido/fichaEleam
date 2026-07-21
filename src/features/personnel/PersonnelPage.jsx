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
          eyebrow="Nómina y competencias"
          title="Equipo del ELEAM"
          description={canManageUsers ? "Crea funcionarios y mantiene sus antecedentes y competencias." : "Consulta antecedentes y competencias del equipo."}
          path="/personal/equipo"
          icon="team"
          disabled={!canManageUsers}
        />
        <AreaCard
          eyebrow="Artículos 14 al 19"
          title="Turnos y dotación"
          description="Programa jornadas y revisa automáticamente las brechas de personal según dependencia."
          path="/personal/dotacion"
          icon="staffing"
          tone="violet"
        />
        <AreaCard
          eyebrow="Artículo 25"
          title="Capacitación y protocolos"
          description="Revisa el plan anual, certificados y protocolos vinculados al personal."
          path="/cumplimiento/obligaciones"
          icon="compliance"
          tone="amber"
        />
      </div>
    </PageLayout>
  );
}
