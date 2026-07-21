import { useNavigate } from "react-router-dom";
import NavIcon from "./NavIcon";

const TONES = {
  teal: "bg-teal-50 text-teal-700 ring-teal-100 group-hover:bg-teal-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 group-hover:bg-blue-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100 group-hover:bg-violet-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100 group-hover:bg-rose-100",
};

export default function AreaCard({ title, description, path, icon, eyebrow, tone = "teal", disabled = false }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => !disabled && navigate(path)}
      disabled={disabled}
      className="group flex min-h-44 w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 transition-colors ${TONES[tone] ?? TONES.teal}`}>
          <NavIcon id={icon} className="h-5 w-5" />
        </span>
        <svg className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </div>
      <div className="mt-5">
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>}
        <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1.5 text-sm leading-5 text-slate-600">{description}</p>
      </div>
    </button>
  );
}
