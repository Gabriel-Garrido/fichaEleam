import PageLayout from "../../layout/PageLayout";
import AreaCard from "../../components/AreaCard";

export default function EstablishmentPage() {
  return (
    <PageLayout
      eyebrow="Instalación y funcionamiento"
      title="Establecimiento"
      description="Mantén en un solo lugar la capacidad, infraestructura y evidencia física que puede revisar la autoridad sanitaria."
      coachFeatureId="establishment"
    >
      <div className="mb-5 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
        Comienza por registrar habitaciones y camas. Los antecedentes documentales del inmueble se gestionan desde Cumplimiento SEREMI para evitar duplicarlos.
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AreaCard
          eyebrow="Artículo 10"
          title="Habitaciones y camas"
          description="Define capacidad, disponibilidad, ubicación y asignación de camas a residentes."
          path="/establecimiento/camas"
          icon="beds"
        />
        <AreaCard
          eyebrow="Autorización sanitaria"
          title="Documentos del inmueble"
          description="Planos, recepción final, servicios básicos, seguridad contra incendios e instalaciones."
          path="/cumplimiento/seremi"
          icon="accreditation"
          tone="blue"
        />
        <AreaCard
          eyebrow="Preparación de fiscalización"
          title="Revisar brechas"
          description="Consulta requisitos pendientes y evidencia que falta completar."
          path="/cumplimiento/obligaciones"
          icon="compliance"
          tone="amber"
        />
      </div>
    </PageLayout>
  );
}
