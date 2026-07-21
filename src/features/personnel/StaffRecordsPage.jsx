import PageLayout from "../../layout/PageLayout";
import StaffCompetenciesTab from "../ds20/StaffCompetenciesTab";
import PersonnelNav from "./PersonnelNav";

export default function StaffRecordsPage() {
  return (
    <PageLayout
      eyebrow="Personal"
      title="Antecedentes SEREMI"
      description="Mantén cargo, tipo de dotación, competencias y capacitación anual de cada persona."
      size="xl"
    >
      <PersonnelNav />
      <StaffCompetenciesTab />
    </PageLayout>
  );
}
