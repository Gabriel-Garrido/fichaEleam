import PageLayout from "../../layout/PageLayout";
import AreaCard from "../../components/AreaCard";

export default function ComplianceHub() {
  return (
    <PageLayout
      eyebrow="Autorización sanitaria y fiscalización"
      title="Cumplimiento SEREMI"
      description="Reúne requisitos, evidencias y registros obligatorios sin obligarte a conocer dónde se originó cada dato."
      coachFeatureId="compliance"
    >
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        La carpeta se completa con documentos y también con evidencia operativa generada en Residentes, Personal y Establecimiento.
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AreaCard eyebrow="Vista principal" title="Requisitos y documentos" description="Revisa avance, vencimientos, evidencia y observaciones por ámbito." path="/cumplimiento/seremi" icon="accreditation" />
        <AreaCard eyebrow="Artículo 25" title="Protocolos y obligaciones" description="Gestiona protocolos, brechas, plazos y reportes periódicos." path="/cumplimiento/obligaciones" icon="compliance" tone="blue" />
        <AreaCard eyebrow="Emergencias" title="Plan y simulacros" description="Mantén actualizado el plan y registra ejercicios y responsables." path="/cumplimiento/emergencias" icon="shield" tone="rose" />
        <AreaCard eyebrow="Artículos 27 y 29" title="Reclamos y sugerencias" description="Registra, responde y consulta solicitudes con trazabilidad." path="/cumplimiento/reclamos" icon="chat" tone="violet" />
        <AreaCard eyebrow="Fiscalización" title="Carpeta exportable" description="Prepara una vista consolidada de evidencia para revisión de la autoridad." path="/cumplimiento/seremi/carpeta" icon="accreditation" tone="amber" />
      </div>
    </PageLayout>
  );
}
