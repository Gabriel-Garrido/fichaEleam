import React from "react";
import MetricHelp from "./MetricHelp";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function interpretConversion(rate) {
  const n = Number(rate);
  if (n < 1)  return { text: "Muy bajo — revisar CTA y calidad del tráfico",  cls: "text-rose-600" };
  if (n < 2)  return { text: "Bajo — mejorar propuesta de valor en landing",  cls: "text-orange-500" };
  if (n < 5)  return { text: "Bueno — dentro del rango SaaS B2B",            cls: "text-teal-600" };
  return        { text: "Excelente — audiencia muy calificada",               cls: "text-emerald-600" };
}

const CTA_LABELS = {
  hero_demo:               "Hero — Solicitar demo",
  hero_how:                "Hero — Cómo funciona",
  pricing_demo:            "Precios — Solicitar demo",
  pricing_institucional:   "Precios — Institucional",
  final_email:             "Footer — Email",
  footer_whatsapp:         "Footer — WhatsApp",
  blog_list_nav_demo:      "Blog lista — Nav demo",
  blog_list_sidebar_demo:  "Blog lista — Sidebar demo",
  blog_list_bottom_demo:   "Blog lista — Bottom demo",
  blog_post_nav_demo:      "Blog post — Nav demo",
  blog_post_article_demo:  "Blog post — Artículo demo",
  blog_post_sidebar_demo:  "Blog post — Sidebar demo",
};

const SECTION_LABELS = {
  features:    "Funcionalidades",
  challenges:  "Desafíos",
  how_it_works:"Cómo funciona",
  pricing:     "Precios",
  faq:         "Preguntas frecuentes",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, tone, help, badge, sub }) {
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <MetricHelp title={label} {...help} />
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      {badge && <p className={`mt-1 text-[11px] font-medium leading-tight ${badge.cls}`}>{badge.text}</p>}
    </article>
  );
}

function FunnelStep({ label, value, max, color, dropPct, dropLabel, tooltip, isLast }) {
  const barPct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3 group" title={tooltip}>
      <span className="w-36 shrink-0 text-xs text-slate-500 text-right leading-tight">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${barPct}%` }} />
        {value > 0 ? (
          <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-white drop-shadow-sm tabular-nums">
            {value.toLocaleString("es-CL")}
          </span>
        ) : (
          <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-slate-400">0</span>
        )}
      </div>
      <span className="w-24 text-right shrink-0">
        {!isLast && dropPct != null ? (
          <span className={`text-[11px] font-medium tabular-nums ${dropPct > 50 ? "text-rose-500" : dropPct > 20 ? "text-amber-500" : "text-emerald-600"}`}>
            {dropPct}% {dropLabel}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-600 tabular-nums">100%</span>
        )}
      </span>
    </div>
  );
}

function HorizontalBar({ label, value, maxValue, color }) {
  const barPct = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600 flex-1 truncate" title={label}>{label}</span>
      <div className="w-24 bg-slate-100 rounded-full h-1.5 shrink-0">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${barPct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function RankedList({ items, labelKey, countKey, labelMap, color, emptyText }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-400 py-2">{emptyText}</p>;
  }
  const maxVal = items[0][countKey];
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const rawLabel = item[labelKey] ?? "";
        const label = labelMap?.[rawLabel] ?? rawLabel;
        return (
          <div key={rawLabel || i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-right">#{i + 1}</span>
            <HorizontalBar label={label} value={item[countKey]} maxValue={maxVal} color={color} />
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ data, maxCount }) {
  return (
    <div className="flex items-end gap-0.5 h-28">
      {data.map((d) => {
        const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group cursor-default">
            <span className="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums font-medium">
              {d.count > 0 ? d.count : ""}
            </span>
            <div
              className={`w-full rounded-t-sm min-h-[2px] transition-all ${d.count > 0 ? "bg-teal-500 group-hover:bg-teal-400" : "bg-slate-100"}`}
              style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%` }}
              title={`${d.date}: ${d.count} visitas`}
            />
            <span className="text-[8px] text-slate-400 transform -rotate-45 origin-top-left truncate w-5 leading-none mt-0.5">
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PageBreakdownBar({ label, count, total, color }) {
  const barPct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-slate-500 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(barPct, count > 0 ? 3 : 0)}%` }} />
        {count > 0 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold text-white drop-shadow-sm tabular-nums">
            {count.toLocaleString("es-CL")}
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-500 w-10 text-right shrink-0 tabular-nums">{barPct}%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingMetrics({ metrics }) {
  if (!metrics) {
    return <div className="text-center text-slate-400 py-8 text-sm">Cargando métricas...</div>;
  }

  const {
    totalVisits, totalLeads, conversionRate,
    totalCtaClicks, totalFormViews, totalFormSubmits,
    topCtas, topSections, sources, pageBreakdown, dailyVisits,
  } = metrics;

  const maxVisits      = Math.max(...dailyVisits.map((d) => d.count), 1);
  const totalPageViews = dailyVisits.reduce((s, d) => s + d.count, 0);
  const avgPerDay      = dailyVisits.length > 0 ? Math.round(totalPageViews / dailyVisits.length) : 0;
  const convInterpret  = interpretConversion(conversionRate);
  const totalPageViewsAll = (pageBreakdown.landing ?? 0) + (pageBreakdown.blog_list ?? 0) + (pageBreakdown.blog_post ?? 0) + (pageBreakdown.other ?? 0);

  return (
    <div className="space-y-6">

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Visitas únicas 30d"
          value={totalVisits.toLocaleString("es-CL")}
          tone="border-sky-200 text-sky-700"
          help={{
            description: "Sesiones únicas basadas en session_id en los últimos 30 días. Un mismo dispositivo que visita la landing en distintos días puede contar como una sola visita (mismo localStorage).",
            source: "landing_events: COUNT DISTINCT session_id WHERE tipo = 'page_view' AND creado_en >= hace 30 días.",
            action: "Si es 0 luego de visitar la landing, el Edge Function 'track-landing-event' no está desplegado o hay un error de CORS. Verificar en Supabase → Edge Functions.",
          }}
        />
        <KpiCard
          label="CTA clickeados 30d"
          value={totalCtaClicks.toLocaleString("es-CL")}
          tone="border-teal-200 text-teal-700"
          sub={totalVisits > 0 ? `${pct(totalCtaClicks, totalVisits)}% de las visitas` : undefined}
          help={{
            description: "Total de clics en botones de llamada a la acción (CTA) en los últimos 30 días. Incluye landing y blog.",
            source: "landing_events: COUNT(*) WHERE tipo = 'cta_click' AND creado_en >= hace 30 días.",
            action: "Un ratio alto de CTAs por visita indica buena alineación del mensaje. Si es 0, el Edge Function no está recibiendo eventos.",
          }}
        />
        <KpiCard
          label="Leads 30d"
          value={totalLeads.toLocaleString("es-CL")}
          tone="border-emerald-200 text-emerald-700"
          sub={totalFormSubmits > 0 ? `${totalFormSubmits} intentos de envío` : undefined}
          help={{
            description: "Prospectos que completaron el formulario de demo exitosamente en los últimos 30 días.",
            source: "demo_leads: COUNT(*) WHERE creado_en >= hace 30 días. No depende de landing_events.",
            action: "Compara con 'Form submits' para detectar fallas de envío. Si hay muchos submits pero pocos leads, puede haber un error en el servidor al guardar el lead.",
          }}
        />
        <KpiCard
          label="Conversión visita→lead"
          value={`${conversionRate}%`}
          tone={Number(conversionRate) >= 2 ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}
          help={{
            description: "Porcentaje de sesiones únicas (page_view) que terminaron con al menos un lead registrado en demo_leads dentro del mismo período de 30 días.",
            source: "Fórmula: demo_leads ÷ sesiones únicas × 100.",
            action: "Referencia SaaS B2B: <2% bajo · 2–5% bueno · >5% excelente. Si la conversión es baja con buen tráfico, revisar el CTA, el mensaje y la propuesta de valor.",
          }}
          badge={convInterpret}
        />
      </div>

      {/* ── Conversion funnel ──────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Embudo de conversión — 30 días</h3>
            <p className="text-xs text-slate-500">De visita a solicitud de demo confirmada.</p>
          </div>
          <MetricHelp
            title="Embudo de conversión"
            description="Muestra cuántas personas pasan por cada etapa del proceso de captación. El porcentaje de cada barra es respecto al paso anterior, mostrando la tasa de caída en cada etapa."
            source="Visitas: session_id únicos en page_view. CTA: total cta_click. Form visto: form_view. Form enviado: form_submit. Lead: demo_leads."
            action="Identifica en qué etapa se pierde más gente. Si hay visitas pero 0 CTAs, el llamado a la acción no es lo suficientemente visible. Si hay CTAs pero 0 form_view, el modal no se abre. Si hay submits pero menos leads, verificar errores de servidor."
          />
        </div>
        <div className="space-y-2.5">
          <FunnelStep
            label="Visitas únicas"
            value={totalVisits}
            max={totalVisits || 1}
            color="bg-sky-500"
            isLast={false}
            dropPct={100}
            dropLabel="base"
            tooltip={`${totalVisits} sesiones únicas registradas`}
          />
          <FunnelStep
            label="Clics en CTA"
            value={totalCtaClicks}
            max={totalVisits || 1}
            color="bg-teal-500"
            isLast={false}
            dropPct={pct(totalCtaClicks, totalVisits)}
            dropLabel="de visitas"
            tooltip={`${totalCtaClicks} clics en botones de demo y otros CTAs`}
          />
          <FunnelStep
            label="Modal visto"
            value={totalFormViews}
            max={totalVisits || 1}
            color="bg-violet-500"
            isLast={false}
            dropPct={pct(totalFormViews, totalCtaClicks || totalVisits)}
            dropLabel={totalCtaClicks > 0 ? "de CTAs" : "de visitas"}
            tooltip={`${totalFormViews} veces se abrió el formulario de demo`}
          />
          <FunnelStep
            label="Formulario enviado"
            value={totalFormSubmits}
            max={totalVisits || 1}
            color="bg-amber-500"
            isLast={false}
            dropPct={pct(totalFormSubmits, totalFormViews || totalVisits)}
            dropLabel={totalFormViews > 0 ? "de aperturas" : "de visitas"}
            tooltip={`${totalFormSubmits} intentos de envío del formulario`}
          />
          <FunnelStep
            label="Demo solicitado"
            value={totalLeads}
            max={totalVisits || 1}
            color="bg-emerald-500"
            isLast={true}
            dropPct={pct(totalLeads, totalFormSubmits || totalVisits)}
            dropLabel={totalFormSubmits > 0 ? "de envíos" : "de visitas"}
            tooltip={`${totalLeads} leads confirmados en la base de datos`}
          />
        </div>
      </section>

      {/* ── Daily chart ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Visitas diarias</h3>
            <p className="text-xs text-slate-500">Últimos 14 días · Pasa el cursor sobre cada barra para ver el detalle.</p>
          </div>
          <MetricHelp
            title="Visitas diarias"
            description="Cantidad de eventos page_view por día en los últimos 14 días. Un mismo visitante que navega múltiples páginas puede generar varios eventos — por eso este total puede superar el número de 'Visitas únicas'."
            source="landing_events: COUNT(*) agrupado por día WHERE tipo = 'page_view', últimos 14 días."
            action="Detecta picos de tráfico y cruza con campañas o publicaciones. Una caída brusca puede indicar un problema técnico en la landing o en el tracking."
          />
        </div>
        <BarChart data={dailyVisits} maxCount={maxVisits} />
        <p className="mt-3 text-[11px] text-slate-400">
          {totalPageViews.toLocaleString("es-CL")} eventos totales · Pico: {maxVisits} · Promedio: {avgPerDay}/día
        </p>
      </section>

      {/* ── Page breakdown ─────────────────────────────────────── */}
      {totalPageViewsAll > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Visitas por página</h3>
              <p className="text-xs text-slate-500">Distribución de page_view entre landing y blog.</p>
            </div>
            <MetricHelp
              title="Visitas por página"
              description="Distribución de los eventos page_view registrados según el tipo de página visitada en los últimos 30 días."
              source="landing_events: campo 'elemento' con valores 'landing', 'blog_list', 'blog_post', registrados por usePageView() en cada componente."
              action="Si el blog genera mucho tráfico pero pocos CTAs, añadir más llamadas a la acción en los posts."
            />
          </div>
          <div className="space-y-2">
            <PageBreakdownBar label="Landing" count={pageBreakdown.landing ?? 0} total={totalPageViewsAll} color="bg-sky-500" />
            <PageBreakdownBar label="Blog (lista)" count={pageBreakdown.blog_list ?? 0} total={totalPageViewsAll} color="bg-teal-500" />
            <PageBreakdownBar label="Blog (artículo)" count={pageBreakdown.blog_post ?? 0} total={totalPageViewsAll} color="bg-teal-300" />
            {(pageBreakdown.other ?? 0) > 0 && (
              <PageBreakdownBar label="Otras" count={pageBreakdown.other} total={totalPageViewsAll} color="bg-slate-400" />
            )}
          </div>
        </section>
      )}

      {/* ── CTAs + Sections grid ───────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">CTAs más clickeados</h3>
              <p className="text-xs text-slate-500">Top 8 botones por clics — 30 días.</p>
            </div>
            <MetricHelp
              title="CTAs clickeados"
              description="Ranking de botones y llamadas a la acción ordenados por número de clics en los últimos 30 días. Incluye CTAs de la landing y del blog."
              source="landing_events: COUNT(*) agrupado por campo 'elemento' WHERE tipo = 'cta_click'. Top 8."
              action="El CTA con más clics indica la mayor intención de demo. Si 'Solicitar demo' tiene pocos clics, considerar hacerlo más prominente o cambiar el texto."
            />
          </div>
          <RankedList
            items={topCtas}
            labelKey="elem"
            countKey="count"
            labelMap={CTA_LABELS}
            color="bg-teal-500"
            emptyText="Sin datos de clics aún. Los clics en botones de demo aparecerán aquí."
          />
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Secciones más vistas</h3>
              <p className="text-xs text-slate-500">Engagement por sección de la landing — 30 días.</p>
            </div>
            <MetricHelp
              title="Secciones más vistas"
              description="Ranking de secciones de la landing que los visitantes scrollearon hasta ver al menos un 30% (IntersectionObserver threshold). Indica qué partes del contenido atraen más atención."
              source="landing_events: COUNT(*) agrupado por 'elemento' WHERE tipo = 'section_view'. Top 6."
              action="Una sección con muy pocas vistas puede estar demasiado abajo en la página o el scroll se detiene antes. Las secciones de precios y FAQ son indicadores de intención alta."
            />
          </div>
          <RankedList
            items={topSections}
            labelKey="name"
            countKey="count"
            labelMap={SECTION_LABELS}
            color="bg-sky-500"
            emptyText="Sin datos de secciones aún."
          />
        </section>
      </div>

      {/* ── UTM sources ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Fuentes de tráfico (UTM)</h3>
            <p className="text-xs text-slate-500">Solo visitas con parámetros UTM en la URL — 30 días.</p>
          </div>
          <MetricHelp
            title="Fuentes de tráfico"
            description="Ranking de pares utm_source/utm_medium para los eventos page_view con parámetros UTM en los últimos 30 días. Las visitas orgánicas o directas (sin UTM) no aparecen aquí."
            source="landing_events: COUNT(*) agrupado por utm_source + '/' + utm_medium WHERE tipo = 'page_view' AND utm_source IS NOT NULL. Top 8."
            action="Si no hay datos UTM, añadir ?utm_source=nombre&utm_medium=canal a los enlaces de campañas de email, redes sociales o ads. El porcentaje es sobre el total de visitas con UTM."
          />
        </div>
        {sources.length === 0 ? (
          <div className="py-2">
            <p className="text-xs text-slate-400">Sin datos UTM aún.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Agrega{" "}
              <code className="bg-slate-100 px-1 rounded text-slate-600">?utm_source=google&utm_medium=cpc</code>{" "}
              a los enlaces de tus campañas para ver el origen del tráfico.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sources.map(({ src, count }, i) => {
              const barPct = Math.round((count / sources[0].count) * 100);
              const pctOfTotal = pct(count, totalVisits);
              return (
                <div key={src} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-right">#{i + 1}</span>
                  <span className="text-xs text-slate-600 flex-1 truncate capitalize" title={src}>
                    {src || "Directo"}
                  </span>
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 shrink-0">
                    <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-24 text-right shrink-0 tabular-nums">
                    {count}{" "}
                    <span className="text-slate-400 font-normal">({pctOfTotal}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
