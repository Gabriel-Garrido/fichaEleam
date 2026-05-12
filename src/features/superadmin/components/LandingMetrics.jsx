import React from "react";
import MetricHelp from "./MetricHelp";

// Fuentes exactas de cada KPI — refleja el código en superadminService.js
const kpiHelp = {
  totalVisits: {
    description: "Sesiones únicas en los últimos 30 días.",
    source: "landing_events: cuenta valores distintos de session_id donde tipo = 'page_view' y creado_en >= hace 30 días. Una session_id distinta = un visitante único.",
    action: "Si hay pocas visitas, revisar SEO, campañas y UTMs. El número puede ser menor a la suma del gráfico diario (que cuenta page_views, no sesiones).",
  },
  totalLeads: {
    description: "Prospectos que completaron el formulario de demo en los últimos 30 días.",
    source: "demo_leads: count(*) donde creado_en >= hace 30 días.",
    action: "Un lead = alguien con intención de evaluar. Compara con visitas para calcular la tasa de conversión real.",
  },
  conversionRate: {
    description: "Porcentaje de sesiones únicas que terminaron enviando el formulario de demo.",
    source: "Fórmula: count(demo_leads) ÷ count(distinct session_id en page_view) × 100, redondeado al entero más cercano.",
    action: "Referencia SaaS B2B: < 2% bajo · 2–5% bueno · > 5% excelente. Si la conversión es baja con buen tráfico, el problema está en la landing (CTA, mensaje, formulario).",
  },
  activeDemo: {
    description: "Prospectos usando la demo en este momento (últimos 3 minutos).",
    source: "demo_leads: estado = 'demo_activo' y demo_ultimo_ping >= hace 3 minutos. El demo envía ping automático mientras el prospecto tiene la sesión abierta.",
    action: "Contacta ahora — es el mejor momento para resolver dudas y agendar una reunión mientras están explorando el producto.",
  },
};

function interpretConversion(rate) {
  const n = Number(rate);
  if (n < 1)  return { text: "Muy bajo — revisar CTA y calidad del tráfico",  cls: "text-rose-600" };
  if (n < 2)  return { text: "Bajo — mejorar propuesta de valor en landing",  cls: "text-orange-500" };
  if (n < 5)  return { text: "Bueno — dentro del rango SaaS B2B",            cls: "text-teal-600" };
  return        { text: "Excelente — audiencia muy calificada",               cls: "text-emerald-600" };
}

function LandingMetricCard({ label, value, tone, help, badge }) {
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <MetricHelp title={label} {...help} />
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {badge && (
        <p className={`mt-1 text-[11px] font-medium leading-tight ${badge.cls}`}>
          {badge.text}
        </p>
      )}
    </article>
  );
}

function FunnelBar({ label, value, max, color, pct, tooltip }) {
  const widthPct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3" title={tooltip}>
      <span className="w-28 shrink-0 text-xs text-slate-500 text-right leading-tight">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${widthPct}%` }}
        />
        {value > 0 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-white drop-shadow-sm">
            {value.toLocaleString("es-CL")}
          </span>
        )}
        {value === 0 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-slate-400">
            0
          </span>
        )}
      </div>
      <span className="w-14 text-xs font-semibold text-slate-600 text-right shrink-0">
        {pct != null ? `${pct}%` : ""}
      </span>
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
              className={`w-full rounded-t-sm min-h-[2px] transition-all ${
                d.count > 0 ? "bg-teal-500 group-hover:bg-teal-400" : "bg-slate-100"
              }`}
              style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 1)}%` }}
              title={`${d.date}: ${d.count} eventos page_view`}
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

export default function LandingMetrics({ metrics, activeInDemo }) {
  if (!metrics) {
    return <div className="text-center text-slate-400 py-8 text-sm">Cargando métricas...</div>;
  }

  const { totalVisits, totalLeads, conversionRate, topCtas, sources, dailyVisits } = metrics;
  const maxVisits  = Math.max(...dailyVisits.map((d) => d.count), 1);
  const activeCount = activeInDemo?.length ?? 0;
  const convInterpret = interpretConversion(conversionRate);
  const totalPageViews = dailyVisits.reduce((s, d) => s + d.count, 0);
  const avgPerDay = dailyVisits.length > 0 ? Math.round(totalPageViews / dailyVisits.length) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LandingMetricCard
          label="Visitas 30d"
          value={totalVisits.toLocaleString("es-CL")}
          tone="border-sky-200 text-sky-700"
          help={kpiHelp.totalVisits}
        />
        <LandingMetricCard
          label="Leads 30d"
          value={totalLeads}
          tone="border-teal-200 text-teal-700"
          help={kpiHelp.totalLeads}
        />
        <LandingMetricCard
          label="Conversión"
          value={`${conversionRate}%`}
          tone={Number(conversionRate) >= 2
            ? "border-emerald-200 text-emerald-700"
            : "border-amber-200 text-amber-700"}
          help={kpiHelp.conversionRate}
          badge={convInterpret}
        />
        <LandingMetricCard
          label="En demo ahora"
          value={activeCount}
          tone={activeCount > 0 ? "border-teal-200 text-teal-700" : "border-slate-200 text-slate-600"}
          help={kpiHelp.activeDemo}
          badge={activeCount > 0
            ? { text: "Contactar ahora — están usando el producto", cls: "text-teal-700" }
            : { text: "Sin sesiones activas (últimos 3 min)", cls: "text-slate-400" }}
        />
      </div>

      {/* Embudo */}
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Embudo de captación — 30 días</h3>
            <p className="text-xs text-slate-500">De visita única a demo activa.</p>
          </div>
          <MetricHelp
            title="Embudo de captación"
            description="Muestra cuántas personas pasan por cada etapa: visitar la landing, enviar el formulario y estar activos en la demo."
            source="Visitas: session_id únicos en page_view. Leads: filas en demo_leads. Demos activas: demo_leads con demo_ultimo_ping en los últimos 3 minutos."
            action="Si hay muchas visitas pero pocos leads, mejorar el CTA o el mensaje. Si hay leads pero pocas demos activas, revisar el proceso de activación (email de bienvenida, acceso)."
          />
        </div>
        <div className="space-y-2.5">
          <FunnelBar
            label="Visitas únicas"
            value={totalVisits}
            max={totalVisits || 1}
            color="bg-sky-500"
            pct={100}
            tooltip={`${totalVisits} sesiones únicas registradas en landing_events`}
          />
          <FunnelBar
            label="Leads captados"
            value={totalLeads}
            max={totalVisits || 1}
            color="bg-teal-500"
            pct={totalVisits > 0 ? Math.round((totalLeads / totalVisits) * 100) : 0}
            tooltip={`${totalLeads} formularios completados en demo_leads`}
          />
          <FunnelBar
            label="En demo ahora"
            value={activeCount}
            max={totalVisits || 1}
            color="bg-violet-500"
            pct={totalVisits > 0 ? Math.round((activeCount / totalVisits) * 100) : 0}
            tooltip={`${activeCount} prospectos con ping en los últimos 3 minutos`}
          />
        </div>
        {totalLeads > 0 && (
          <p className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            De {totalLeads} lead{totalLeads !== 1 ? "s" : ""} captado{totalLeads !== 1 ? "s" : ""},{" "}
            {activeCount} {activeCount !== 1 ? "están" : "está"} en demo activa
            {" "}({Math.round((activeCount / totalLeads) * 100)}% activación del lead).
          </p>
        )}
      </section>

      {/* Gráfico diario */}
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Eventos de visita diarios</h3>
            <p className="text-xs text-slate-500">
              Últimos 14 días · Pasa el cursor sobre cada barra para ver el conteo.
            </p>
          </div>
          <MetricHelp
            title="Eventos de visita diarios"
            description="Cuenta de todos los eventos page_view por día (no sesiones únicas). Un mismo visitante que navega varias páginas genera varios page_view. Por eso este total puede ser mayor al número de 'Visitas únicas'."
            source="landing_events: count(*) por día donde tipo = 'page_view', últimos 14 días."
            action="Detecta picos de tráfico y cruza con campañas o publicaciones. Una caída brusca puede indicar problema técnico en la landing."
          />
        </div>
        <BarChart data={dailyVisits} maxCount={maxVisits} />
        <p className="mt-3 text-[11px] text-slate-400">
          {totalPageViews} eventos totales en 14 días · Pico: {maxVisits} · Promedio: {avgPerDay} eventos/día
        </p>
      </section>

      {/* CTAs y fuentes */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">CTAs más clickeados</h3>
              <p className="text-xs text-slate-500">Top 8 botones/enlaces por clics.</p>
            </div>
            <MetricHelp
              title="CTAs clickeados"
              description="Ranking de elementos interactivos de la landing ordenados por número de clics en los últimos 30 días."
              source="landing_events: count(*) agrupado por campo 'elemento' donde tipo = 'cta_click' y creado_en >= hace 30 días. Top 8."
              action="El CTA con más clics es el que más genera intención. Si 'Solicitar demo' tiene pocos clics, hacerlo más prominente o cambiar el texto."
            />
          </div>
          {topCtas.length === 0 ? (
            <p className="text-xs text-slate-400">Sin datos de clics aún.</p>
          ) : (
            <div className="space-y-2.5">
              {topCtas.map(({ elem, count }, i) => {
                const barPct = Math.round((count / topCtas[0].count) * 100);
                return (
                  <div key={elem} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-right">#{i + 1}</span>
                    <span className="text-xs text-slate-600 flex-1 truncate" title={elem}>{elem}</span>
                    <div className="w-20 bg-slate-100 rounded-full h-1.5 shrink-0">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-8 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Fuentes de tráfico</h3>
              <p className="text-xs text-slate-500">Por parámetros UTM en page_view.</p>
            </div>
            <MetricHelp
              title="Fuentes de tráfico"
              description="Ranking de pares utm_source/utm_medium para los eventos page_view de los últimos 30 días. Solo aparecen visitas que incluyen parámetros UTM en la URL."
              source="landing_events: count(*) agrupado por utm_source + '/' + utm_medium donde tipo = 'page_view' y utm_source IS NOT NULL. Top 8."
              action="Si 'Sin datos UTM' aparece, agrega ?utm_source=nombre&utm_medium=canal a los enlaces de tus campañas. El porcentaje es respecto al total de visitas con UTM, no del total absoluto."
            />
          </div>
          {sources.length === 0 ? (
            <div>
              <p className="text-xs text-slate-400">Sin datos UTM aún.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Agrega <code className="bg-slate-100 px-1 rounded">?utm_source=google&utm_medium=cpc</code> a los enlaces de tus campañas para ver el origen.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sources.map(({ src, count }, i) => {
                const barPct = Math.round((count / sources[0].count) * 100);
                const pctOfTotal = totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0;
                return (
                  <div key={src} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-right">#{i + 1}</span>
                    <span className="text-xs text-slate-600 flex-1 truncate capitalize" title={src}>
                      {src || "Directo"}
                    </span>
                    <div className="w-20 bg-slate-100 rounded-full h-1.5 shrink-0">
                      <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-20 text-right shrink-0 tabular-nums">
                      {count} <span className="text-slate-400 font-normal">({pctOfTotal}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
