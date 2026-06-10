// Bundled (hashed) WebP for in-app rendering. The PNGs under /marketing are kept
// for OG/social previews (publicSrc), which some scrapers still prefer over WebP.
import heroWebp from "../../assets/images/opt/hero.webp";
import softwareWebp from "../../assets/images/opt/software.webp";
import comparisonWebp from "../../assets/images/opt/comparison.webp";
import shiftWebp from "../../assets/images/opt/shift.webp";
import logoHorizontal from "../../assets/images/opt/logo-horizontal.webp";
import logoHorizontalTeal from "../../assets/images/opt/logo-horizontal-teal.webp";
import logoWordmark from "../../assets/images/opt/logo-wordmark.webp";
import logoSymbol from "../../assets/images/opt/logo-symbol.webp";
import appIcon from "../../assets/images/opt/app-icon.webp";

export const PUBLIC_ASSETS = {
  logoIcon: {
    src: appIcon,
    publicSrc: "/marketing/fichaeleam-app-icon-color.png",
    alt: "Icono de FichaEleam, software para ELEAM en Chile",
  },
  hero: {
    src: heroWebp,
    publicSrc: "/marketing/fichaeleam-hero-demo-soporte.png",
    alt: "Directora de un ELEAM usando FichaEleam en su notebook, con el panel de inicio y soporte por WhatsApp",
    width: 1600,
    height: 900,
  },
  software: {
    src: softwareWebp,
    publicSrc: "/marketing/software-eleam-dashboard-signos-residente.png",
    alt: "Panel de FichaEleam con los signos vitales y la ficha de un residente",
    width: 1600,
    height: 900,
  },
  comparison: {
    src: comparisonWebp,
    publicSrc: "/marketing/excel-papel-vs-fichaeleam-dashboard.png",
    alt: "Comparación entre planillas y carpetas en papel frente al panel digital de FichaEleam",
    width: 1600,
    height: 900,
  },
  shift: {
    src: shiftWebp,
    publicSrc: "/marketing/entrega-turno-equipo-clinico-dashboard.png",
    alt: "Equipo de un ELEAM registrando la entrega de turno en FichaEleam",
    width: 1600,
    height: 900,
  },
};

// Brand lockups (transparent WebP, padding trimmed). Use `horizontal` on light
// surfaces and `horizontalTeal` on dark surfaces.
export const LOGOS = {
  horizontal: { src: logoHorizontal, alt: "FichaEleam" },
  horizontalTeal: { src: logoHorizontalTeal, alt: "FichaEleam" },
  wordmark: { src: logoWordmark, alt: "FichaEleam" },
  symbol: { src: logoSymbol, alt: "" },
  appIcon: { src: appIcon, alt: "" },
};

export const PUBLIC_BUTTON = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-900/10 transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
  dark:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
  // Bright accent for dark heroes (high-contrast primary).
  accent:
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-teal-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-300 hover:shadow-teal-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
  whatsapp:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
};

export function getBlogFallbackAsset(post) {
  const text = `${post?.titulo ?? ""} ${(post?.keywords ?? []).join(" ")}`.toLowerCase();
  if (text.includes("seremi") || text.includes("decreto 20") || text.includes("fiscal")) {
    return PUBLIC_ASSETS.comparison;
  }
  if (text.includes("signo") || text.includes("clin") || text.includes("residente")) {
    return PUBLIC_ASSETS.software;
  }
  return PUBLIC_ASSETS.shift;
}
