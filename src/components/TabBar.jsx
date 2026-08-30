import { useEffect, useRef } from "react";

// Barra de pestañas segmentada para páginas con secciones internas.
// tabs: [{ id, label }]
export default function TabBar({ tabs, active, onChange, label = "Secciones", tone = "teal", compact = false, className = "" }) {
  const buttonRefs = useRef(new Map());
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    const button = buttonRefs.current.get(active);
    if (!list || !button) return;
    const left = button.offsetLeft - (list.clientWidth - button.clientWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const moveFocus = (event, index) => {
    if (!tabs.length) return;
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    onChange(next.id);
    buttonRefs.current.get(next.id)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={`mb-6 flex snap-x gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        const activeClass = tone === "slate" ? "bg-slate-900 text-white shadow-sm" : "bg-teal-700 text-white shadow-sm";
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) buttonRefs.current.set(tab.id, node);
              else buttonRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => moveFocus(event, index)}
            className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${compact ? "min-h-10 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2 text-sm"} ${
              isActive ? activeClass : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
