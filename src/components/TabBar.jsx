// Barra de pestañas segmentada para páginas con secciones internas.
// tabs: [{ id, label }]
export default function TabBar({ tabs, active, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              isActive ? "bg-teal-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
