import React from "react";

export default function LandingMetrics({ metrics, activeInDemo }) {
  if (!metrics) {
    return <div className="text-center text-gray-400 py-8 text-sm">Cargando métricas...</div>;
  }

  const { totalVisits, totalLeads, conversionRate, topCtas, sources, dailyVisits } = metrics;
  const maxVisits = Math.max(...dailyVisits.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Visitas (30d)", value: totalVisits, color: "text-blue-600" },
          { label: "Leads captados (30d)", value: totalLeads, color: "text-teal-600" },
          { label: "Tasa conversión", value: `${conversionRate}%`, color: conversionRate > 5 ? "text-green-600" : "text-amber-600" },
          { label: "En demo ahora", value: activeInDemo?.length ?? 0, color: activeInDemo?.length > 0 ? "text-teal-600 animate-pulse" : "text-gray-500" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Daily visits chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Visitas diarias (últimos 14 días)</h3>
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
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top CTAs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Top CTAs clickeados</h3>
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
        </div>

        {/* Sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Fuentes de tráfico</h3>
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
        </div>
      </div>
    </div>
  );
}
