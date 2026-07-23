import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import { friendlyError } from "../../utils/errorMessages";
import {
  getRequisitosEleam,
  getObservaciones,
  getOperationalEvidence,
} from "./accreditationService";
import { formatDate } from "../../utils/dateUtils";
import { FeatureCoach } from "../featureCoach";
import { buildComplianceAreas, simpleRequirementStatus } from "./accreditationOverview";

// Carpeta SEREMI imprimible. La idea es ser una vista limpia, sin nav,
// optimizada para impresión a PDF (Ctrl+P → Guardar como PDF).

export default function AccreditationCarpeta() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam } = useAuth();
  const [requisitos, setRequisitos] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [operationalEvidence, setOperationalEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getRequisitosEleam(), getObservaciones(), getOperationalEvidence()])
      .then(([r, o, evidence]) => {
        if (!mounted) return;
        setRequisitos(r);
        setObservaciones(o);
        setOperationalEvidence(evidence);
      })
      .catch((e) => mounted && toast(friendlyError(e, "No se pudo cargar la carpeta SEREMI. Recarga la página."), "error"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [toast]);

  const requisitosPorAmbito = useMemo(
    () => buildComplianceAreas(requisitos, observaciones, operationalEvidence),
    [requisitos, observaciones, operationalEvidence],
  );
  const resumen = useMemo(() => {
    const totals = requisitosPorAmbito.reduce((acc, group) => ({
      total: acc.total + group.items.length,
      vigente: acc.vigente + group.compliant,
      noAplica: acc.noAplica + group.notApplicable,
      pendientes: acc.pendientes + group.pending,
    }), { total: 0, vigente: 0, noAplica: 0, pendientes: 0 });
    const evaluables = totals.total - totals.noAplica;
    return {
      ...totals,
      porcentaje: totals.total === 0 ? 0 : evaluables > 0 ? Math.round((totals.vigente / evaluables) * 100) : 100,
      evidenciasVigentes: requisitos.reduce((count, item) => count + (item.documentos ?? []).filter((doc) => doc.vigente).length, 0),
      ambitos: requisitosPorAmbito,
    };
  }, [requisitos, requisitosPorAmbito]);

  if (loading) return <Loading message="Generando Carpeta SEREMI..." />;

  return (
    <div className="bg-white">
      <div className="print:hidden max-w-4xl mx-auto px-4 pt-4">
        <FeatureCoach featureId="accreditation-carpeta" standalone />
      </div>
      {/* Toolbar (oculta al imprimir) */}
      <div className="print:hidden sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button type="button"
 onClick={() => navigate("/cumplimiento")} className="text-sm text-slate-500 hover:text-slate-800">
            ← Volver
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-800"
            >
              🖨 Imprimir / Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 print:py-4 print:px-0 space-y-6 text-slate-800">
        {/* Portada */}
        <div className="text-center border-b border-slate-300 pb-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
            Carpeta SEREMI · Decreto N°20 MINSAL
          </p>
          <h1 className="text-3xl font-black mt-1">{eleam?.nombre ?? "ELEAM"}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generado el {formatDate(new Date().toISOString())}
          </p>
        </div>

        {/* Resumen */}
        <section>
          <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-3">Resumen general</h2>
          {resumen.total === 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:border-slate-300 print:bg-white">
              Esta carpeta aún no tiene requisitos SEREMI provisionados. Vuelve al panel de acreditación e inicializa los requisitos antes de exportar.
            </div>
          )}
          {resumen.total > 0 && (resumen.evidenciasVigentes === 0 || resumen.pendientes > 0) && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:border-slate-300 print:bg-white">
              Carpeta en preparación: {resumen.evidenciasVigentes} evidencia{resumen.evidenciasVigentes === 1 ? "" : "s"} vigente{resumen.evidenciasVigentes === 1 ? "" : "s"} y {resumen.pendientes} requisito{resumen.pendientes === 1 ? "" : "s"} pendiente{resumen.pendientes === 1 ? "" : "s"} de revisión.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Cumplimiento global</p>
              <p className="text-3xl font-black">{resumen.porcentaje}%</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Total requisitos</p>
              <p className="text-3xl font-black">{resumen.total}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Pendientes / Observados</p>
              <p className="text-3xl font-black">{resumen.pendientes}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Evidencias vigentes</p>
              <p className="text-3xl font-black">{resumen.evidenciasVigentes}</p>
            </div>
          </div>
        </section>

        {/* Cumplimiento por ámbito */}
        <section>
          <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-3">Cumplimiento por ámbito</h2>
          {resumen.ambitos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ámbitos provisionados para este ELEAM.</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-3">Código</th>
                <th>Ámbito</th>
                <th className="text-center px-2">Requisitos</th>
                <th className="text-center px-2">Vigentes</th>
                <th className="text-center px-2">Pendientes</th>
                <th className="text-center px-2">%</th>
              </tr>
            </thead>
            <tbody>
              {resumen.ambitos.map((a) => (
                <tr key={a.area.codigo} className="border-b">
                  <td className="py-2 pr-3 font-mono text-xs">{a.area.codigo}</td>
                  <td className="py-2">{a.area.nombre}</td>
                  <td className="text-center px-2">{a.items.length}</td>
                  <td className="text-center px-2 text-emerald-700">{a.compliant}</td>
                  <td className="text-center px-2 text-amber-700">{a.pending}</td>
                  <td className="text-center px-2 font-semibold">{a.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </section>

        {/* Observaciones abiertas */}
        {observaciones.filter((o) => o.estado !== "cerrada").length > 0 && (
          <section>
            <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-3">Observaciones abiertas</h2>
            <ul className="space-y-2 text-sm">
              {observaciones.filter((o) => o.estado !== "cerrada").map((o) => (
                <li key={o.id} className="border border-slate-200 rounded-xl p-3">
                  <p className="text-xs text-slate-500">
                    {o.origen === "fiscalizacion" ? "Fiscalización" : "Interna"} · {formatDate(o.fecha)}
                    {o.requisito_eleam?.requisito && (
                      <> · {o.requisito_eleam.requisito.codigo} {o.requisito_eleam.requisito.nombre}</>
                    )}
                  </p>
                  <p className="text-slate-800">{o.descripcion}</p>
                  {o.acciones_subsanacion && (
                    <p className="text-xs text-slate-600 mt-1">Subsanación: {o.acciones_subsanacion}</p>
                  )}
                  {o.fecha_compromiso && (
                    <p className="text-xs text-slate-600">Compromiso: {formatDate(o.fecha_compromiso)}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Detalle por ámbito */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-1">Detalle de requisitos</h2>
          {requisitosPorAmbito.length === 0 && (
            <p className="text-sm text-slate-500">No hay requisitos para listar.</p>
          )}
          {requisitosPorAmbito.map((g) => (
            <div key={g.area.codigo} className="break-inside-avoid">
              <h3 className="text-base font-bold text-teal-700 mt-4 mb-2">
                {g.area.codigo} · {g.area.nombre}
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-1 pr-2 w-20">Código</th>
                    <th className="pr-2">Requisito</th>
                    <th className="text-center px-2 w-24">Estado</th>
                    <th className="px-2 w-24">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((re) => {
                    const m = simpleRequirementStatus(re);
                    const tone = {
                      emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
                      slate: "bg-slate-100 text-slate-700 border-slate-200",
                      rose: "bg-rose-100 text-rose-800 border-rose-200",
                      orange: "bg-orange-100 text-orange-800 border-orange-200",
                      violet: "bg-violet-100 text-violet-800 border-violet-200",
                      sky: "bg-sky-100 text-sky-800 border-sky-200",
                      amber: "bg-amber-100 text-amber-800 border-amber-200",
                    }[m.tone];
                    return (
                      <tr key={re.id} className="border-b align-top">
                        <td className="py-1 pr-2 font-mono">{re.requisito.codigo}</td>
                        <td className="pr-2">
                          <p className="font-semibold">{re.requisito.nombre}</p>
                          {re.requisito.medio_verificador && (
                            <p className="text-slate-500 text-[10px]">Verificador: {re.requisito.medio_verificador}</p>
                          )}
                          {re.requisito.articulo_ref && (
                            <p className="text-slate-500 text-[10px]">Referencia: {re.requisito.articulo_ref}</p>
                          )}
                          {re.operationalEvidence && (
                            <p className="mt-1 text-[10px] font-semibold text-teal-800">
                              {re.operationalEvidence.completa_requisito ? "Cálculo automático" : "Avance registrado"}: {re.operationalEvidence.denominador > 0
                                ? `${re.operationalEvidence.numerador}/${re.operationalEvidence.denominador} (${re.operationalEvidence.porcentaje}%)`
                                : "sin datos"} · {re.operationalEvidence.resumen}
                            </p>
                          )}
                          {re.no_aplica_motivo && (
                            <p className="text-slate-500 italic text-[10px]">No aplica: {re.no_aplica_motivo}</p>
                          )}
                        </td>
                        <td className="text-center px-2">
                          <span className={`inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 border ${tone}`}>
                            {m.label}
                          </span>
                        </td>
                        <td className="px-2 text-center">
                          {re.fecha_vencimiento ? formatDate(re.fecha_vencimiento) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <div className="text-xs text-slate-400 text-center pt-6 border-t border-slate-200">
          FichaEleam · Documento generado automáticamente para fiscalización SEREMI.
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .print\\:px-0 { padding-left: 0; padding-right: 0; }
        }
      `}</style>
    </div>
  );
}
