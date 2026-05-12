import { useState, useEffect, useRef } from "react";

const TIP_W = 288;
const MARGIN = 8;

function calcCoords(btn) {
  const r = btn.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(TIP_W, vw - MARGIN * 2);

  let left = r.right - w;
  if (left < MARGIN) left = MARGIN;
  if (left + w > vw - MARGIN) left = vw - w - MARGIN;

  const spaceBelow = vh - r.bottom - 6;
  const flipUp = spaceBelow < 200;
  const top = flipUp ? r.top - 6 : r.bottom + 6;

  return { top, left, w, flipUp };
}

export default function MetricHelp({ title, description, source, action }) {
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const toggle = () => {
    if (coords) { setCoords(null); return; }
    setCoords(calcCoords(btnRef.current));
  };

  useEffect(() => {
    if (!coords) return;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setCoords(null);
    };
    const esc = (e) => { if (e.key === "Escape") setCoords(null); };
    document.addEventListener("mousedown", close, true);
    document.addEventListener("touchstart", close, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("touchstart", close, true);
      document.removeEventListener("keydown", esc);
    };
  }, [coords]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-label={`Ayuda: ${title}`}
        aria-expanded={!!coords}
        onClick={toggle}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border bg-white text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-200 ${
          coords
            ? "border-teal-500 text-teal-700"
            : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700"
        }`}
      >
        ?
      </button>
      {coords && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.w,
            transform: coords.flipUp ? "translateY(calc(-100% - 12px))" : undefined,
          }}
          className="z-[9999] rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl"
        >
          <span className="block text-xs font-semibold text-slate-800">{title}</span>
          {description && (
            <span className="mt-1 block text-xs leading-relaxed text-slate-600 whitespace-pre-line">
              {description}
            </span>
          )}
          {source && (
            <span className="mt-2 block text-[11px] leading-relaxed text-slate-500 whitespace-pre-line">
              <span className="font-semibold text-slate-600">Fuente:</span> {source}
            </span>
          )}
          {action && (
            <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 whitespace-pre-line">
              <span className="font-semibold text-slate-600">Uso:</span> {action}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
