import React from "react";
import MetricHelp from "./MetricHelp";

const kpiHelp = {
  totalVisits: {
    description: "Sesiones unicas que visitaron la landing durante los ultimos 30 dias.",
    source: "public.landing_events con tipo = page_view, agrupado por session_id.",
    action: "Evalua alcance real de campanas y trafico organico.",
  },
  totalLeads: {
    description: "Leads captados por el formulario de demo en los ultimos 30 dias.",
    source: "public.demo_leads.creado_en dentro de la ventana de 30 dias.",
    action: "Mide generacion de demanda y volumen para seguimiento comercial.",
  },
  conversionRate: {
    description: "Porcentaje de visitas que terminaron creando un lead.",
    source: "Leads captados dividido por sesiones unicas de landing.",
    action: "Ayuda a revisar si la landing convierte o si el trafico no calza con la oferta.",
  },
  activeDemo: {
    description: "Prospectos con demo activa y actividad reciente.",
    source: "public.demo_leads con estado = demo_activo y demo_ultimo_ping reciente.",
    action: "Prioriza contacto mientras el prospecto esta usando la demo.",
  },
};

function LandingMetricCard({ label, value, tone, help }) {
  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <MetricHelp title={label} {...help} />
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </article>
  );
}

export default function LandingMetrics({ metrics, activeInDemo }) {
  if (!metrics) {
    return <div className="text-center text-gray-400 py-8 text-sm">Cargando métricas...</div>;
  }

  const { totalVisits, totalLeads, conversionRate, topCtas, sources, dailyVisits } = metrics;
  const maxVisits = Math.max(...dailyVisits.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Visitas 30d",
            value: totalVisits,
            tone: "border-sky-200 text-sky-700",
            help: kpiHelp.totalVisits,
          },
          {
            label: "Leads 30d",
            value: totalLeads,
            tone: "border-teal-200 text-teal-700",
            help: kpiHelp.totalLeads,
          },
          {
            label: "Conversion",
            value: `${conversionRate}%`,
            tone: conversionRate > 5
              ? "border-emerald-200 text-emerald-700"
              : "border-amber-200 text-amber-700",
            help: kpiHelp.conversionRate,
          },
          {
            label: "En demo ahora",
            value: activeInDemo?.length ?? 0,
            tone: activeInDemo?.length > 0
              ? "border-teal-200 text-teal-700"
              : "border-slate-200 text-slate-700",
            help: kpiHelp.activeDemo,
          },
        ].map((c) => (
          <LandingMetricCard key={c.label} {...c} />
        ))}
      </div>

      <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Visitas diarias</h3>
            <p className="text-xs text-slate-500">Ultimos 14 dias, segun eventos de landing.</p>
          </div>
          <MetricHelp
            title="Visitas diarias"
            description="Cuenta page_view por dia para detectar picos, caidas y efecto de campanas."
            source="public.landing_events.tipo = page_view, agrupado por fecha de creado_en."
            action="Cruza los picos con campañas, publicaciones o cambios en la landing."
          />
        </div>
        <div className="flex items-end gap-1 h-28">
          {dailyVisits.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
              <div
                className="w-full bg-teal-500 rounded-t-sm min-h-[2px] transition-all"
                style={{ height: `${maxVisits > 0 ? (d.count / maxVisits) * 100 : 0}%` }}
              />
              <span className="text-[9px] text-gray-400 transform -rotate-45 origin-top-left truncate w-6">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">CTAs clickeados</h3>
              <p className="text-xs text-slate-500">Botones con mas interaccion.</p>
            </div>
            <MetricHelp
              title="CTAs clickeados"
              description="Ranking de elementos clickeados en la landing."
              source="public.landing_events.tipo = cta_click, agrupado por elemento."
              action="Identifica que llamados a la accion generan mas intencion."
            />
          </div>
          {topCtas.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {topCtas.map(({ elem, count }) => (
                <div key={elem} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 flex-1 truncate">{elem}</span>
                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full"
                      style={{ width: `${(count / topCtas[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Fuentes de tráfico</h3>
              <p className="text-xs text-slate-500">Origen declarado por UTM.</p>
            </div>
            <MetricHelp
              title="Fuentes de tráfico"
              description="Ranking de origen/medio para las visitas registradas."
              source="public.landing_events.utm_source y utm_medium en eventos page_view."
              action="Compara rendimiento de canales pagados, organicos y referidos."
            />
          </div>
          {sources.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos UTM aún</p>
          ) : (
            <div className="space-y-2">
              {sources.map(({ src, count }) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 flex-1 truncate">{src}</span>
                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(count / sources[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
