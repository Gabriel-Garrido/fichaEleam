import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PUBLIC_BUTTON, getBlogFallbackAsset, LOGOS } from "./publicDesignAssets";

const ICON_PATHS = {
  check: "M5 13l4 4L19 7",
  arrow: "M17 8l4 4m0 0l-4 4m4-4H3",
  shield:
    "M9 12.75 11.25 15 15 9.75m6-1.5A11.955 11.955 0 0 1 12 21.75 11.955 11.955 0 0 1 3 8.25 11.955 11.955 0 0 1 12 2.25c2.07 0 4.003.525 5.69 1.444",
  document:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414A1 1 0 0 1 19 9.414V19a2 2 0 0 1-2 2Z",
  heart:
    "M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0Z",
  users:
    "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  pulse: "M3.75 13.5h3l2.25-7.5 4.5 15 2.25-7.5h4.5",
  lock:
    "M16.5 10.5V7.5a4.5 4.5 0 0 0-9 0v3m-.75 0h10.5A1.75 1.75 0 0 1 19 12.25v6A1.75 1.75 0 0 1 17.25 20H6.75A1.75 1.75 0 0 1 5 18.25v-6a1.75 1.75 0 0 1 1.75-1.75Z",
  clock: "M12 6v6l3.75 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  x: "M6 18 18 6M6 6l12 12",
  medicine: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 1 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  sparkle:
    "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
  building:
    "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0V11.25A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25",
  chart:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125Z",
  bell:
    "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
};

export function PublicIcon({ name = "check", className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={ICON_PATHS[name] ?? ICON_PATHS.check} />
    </svg>
  );
}

export function WhatsAppGlyph({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.12 1.511 5.855L.057 23.82a.5.5 0 0 0 .61.61l5.962-1.453A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75A9.75 9.75 0 1 1 12 2.25a9.75 9.75 0 0 1 0 19.5z" />
    </svg>
  );
}

export function Wordmark({ variant = "light", className = "h-9" }) {
  const logo = variant === "dark" ? LOGOS.horizontalTeal : LOGOS.horizontal;
  return (
    <img
      src={logo.src}
      alt="FichaEleam"
      width={logo.width ?? 512}
      height={logo.height ?? 140}
      decoding="async"
      className={`${className} w-auto object-contain`}
      draggable="false"
    />
  );
}

export function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

export function PublicBadge({ children, tone = "teal", className = "" }) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    slate: "border-slate-200 bg-white text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    dark: "border-white/10 bg-white/8 text-teal-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tones[tone] ?? tones.teal} ${className}`}>
      {children}
    </span>
  );
}

export function Eyebrow({ children, dark = false, className = "" }) {
  return (
    <p className={`flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] ${dark ? "text-teal-300" : "text-teal-700"} ${className}`}>
      <span className={`h-px w-6 ${dark ? "bg-teal-400/60" : "bg-teal-500/60"}`} />
      {children}
    </p>
  );
}

export function PublicSection({
  eyebrow,
  title,
  description,
  children,
  tone = "white",
  center = false,
  className = "",
  id,
}) {
  const tones = {
    white: "bg-white",
    soft: "bg-slate-50",
    dark: "bg-slate-950 text-white",
  };
  const dark = tone === "dark";
  return (
    <section id={id} className={`public-section-contained scroll-mt-public ${tones[tone] ?? tones.white} px-5 py-20 sm:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">
        {(eyebrow || title || description) && (
          <Reveal className={`${center ? "mx-auto items-center text-center" : ""} mb-12 flex max-w-3xl flex-col`}>
            {eyebrow && (
              <div className={center ? "mx-auto" : ""}>
                <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
              </div>
            )}
            {title && (
              <h2 className={`mt-4 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-[2.6rem] ${dark ? "text-white" : "text-slate-950"}`}>
                {title}
              </h2>
            )}
            {description && (
              <p className={`mt-4 text-base leading-7 text-pretty ${dark ? "text-slate-300" : "text-slate-600"}`}>
                {description}
              </p>
            )}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

export function PublicBreadcrumb({ items = [], current, dark = false }) {
  const linkClass = dark
    ? "font-medium text-slate-300 hover:text-white"
    : "font-medium text-slate-500 hover:text-teal-700";
  const slashClass = dark ? "text-slate-600" : "text-slate-300";
  const currentClass = dark ? "line-clamp-1 text-white" : "line-clamp-1 text-slate-800";
  return (
    <nav className={`mb-6 flex flex-wrap items-center gap-2 text-xs ${dark ? "text-slate-300" : "text-slate-500"}`} aria-label="Breadcrumb">
      <Link to="/" className={linkClass}>Inicio</Link>
      {items.map((item) => (
        <span key={item.to} className="inline-flex items-center gap-2">
          <span className={slashClass}>/</span>
          <Link to={item.to} className={linkClass}>{item.label}</Link>
        </span>
      ))}
      {current && (
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className={slashClass}>/</span>
          <span className={currentClass}>{current}</span>
        </span>
      )}
    </nav>
  );
}

export function Stat({ value, label, dark = false, className = "" }) {
  return (
    <div className={className}>
      <p className={`font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>
        {value}
      </p>
      <p className={`mt-1.5 text-xs leading-4 ${dark ? "text-slate-500" : "text-slate-500"}`}>{label}</p>
    </div>
  );
}

export function PublicMetric({ value, label, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-900 border-teal-100",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100",
    sky: "bg-sky-50 text-sky-900 border-sky-100",
    slate: "bg-white text-slate-900 border-slate-200",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone] ?? tones.teal}`}>
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}

const TONE_ICON = {
  teal: "bg-teal-50 text-teal-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  sky: "bg-sky-50 text-sky-700",
  slate: "bg-slate-100 text-slate-700",
  rose: "bg-rose-50 text-rose-700",
};

const TONE_GLOW = {
  teal: "bg-teal-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  slate: "bg-slate-300",
  rose: "bg-rose-400",
};

export function PublicFeatureCard({ icon = "check", title, text, metric, tone = "teal", big = false }) {
  return (
    <article className={`group relative h-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-900/5 ${big ? "p-7" : "p-6"}`}>
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl transition-transform group-hover:scale-105 ${TONE_ICON[tone] ?? TONE_ICON.teal}`}>
        <PublicIcon name={icon} className="h-5 w-5" />
      </div>
      {metric && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">{metric}</p>
      )}
      <h3 className={`font-semibold text-slate-950 ${big ? "text-xl" : "text-base"}`}>{title}</h3>
      <p className={`mt-2 leading-6 text-slate-600 ${big ? "text-base" : "text-sm"}`}>{text}</p>
      {big && (
        <div className={`pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full ${TONE_GLOW[tone] ?? TONE_GLOW.teal} opacity-10 blur-2xl`} />
      )}
    </article>
  );
}

export function ProductImage({ asset, priority = false, className = "", caption, sizes = "(min-width: 1024px) 50vw, 100vw" }) {
  return (
    <figure className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ${className}`}>
      <img
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        sizes={sizes}
        className="h-full w-full object-cover"
      />
      {caption && (
        <figcaption className="border-t border-slate-100 bg-white px-4 py-3 text-xs font-medium text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Premium framed product photo (our assets are lifestyle/device mockups, not bare
// screenshots, so no browser chrome). Optional perspective tilt, soft glow and
// floating callout cards. `annotations` items: { className, icon, label, value, tone, badge, rotate }.
export function ProductShowcase({ asset, priority = false, tilt = false, annotations = [], className = "", glow = true, rounded = "rounded-3xl", sizes = "(min-width: 1024px) 50vw, 100vw" }) {
  const toneText = {
    teal: "text-teal-300 bg-teal-500/15",
    rose: "text-rose-300 bg-rose-500/15",
    amber: "text-amber-300 bg-amber-500/15",
    emerald: "text-emerald-300 bg-emerald-500/15",
    sky: "text-sky-300 bg-sky-500/15",
  };
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-gradient-to-tr from-teal-500/25 via-emerald-500/12 to-transparent blur-3xl" />
      )}
      <figure className={`relative overflow-hidden ${rounded} bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/10 ${tilt ? "showcase-tilt" : ""}`}>
        <img
          src={asset.src}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          sizes={sizes}
          className="h-full w-full object-cover"
        />
      </figure>
      {annotations.map((a, i) => (
        <div
          key={a.label ?? i}
          className={`absolute z-20 hidden rounded-xl border border-white/10 bg-slate-900/95 p-3.5 shadow-2xl shadow-slate-950/50 backdrop-blur-md md:block animate-float-card ${a.className ?? ""}`}
          style={{ "--card-rotate": a.rotate ?? "0deg", animationDelay: `${i * 1.4}s` }}
          aria-hidden
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${toneText[a.tone ?? "teal"]}`}>
                <PublicIcon name={a.icon ?? "check"} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                {a.label && <p className={`text-[9px] font-bold uppercase tracking-wider ${(toneText[a.tone ?? "teal"]).split(" ")[0]}`}>{a.label}</p>}
                {a.value && <p className="truncate text-xs font-semibold text-white">{a.value}</p>}
              </div>
            </div>
            {a.badge && (
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${toneText[a.tone ?? "teal"]}`}>{a.badge}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PublicCtaBand({ title, text, primaryLabel, onPrimary, secondaryLabel, secondaryTo, source }) {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-5 py-20 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600/15 blur-[100px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 public-grid-pattern opacity-20" />
      <Reveal className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-3xl">
          <Eyebrow dark>FichaEleam</Eyebrow>
          <h2 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-[2.6rem]">{title}</h2>
          <p className="mt-4 text-base leading-7 text-slate-400">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button type="button" onClick={() => onPrimary?.(source)} className={PUBLIC_BUTTON.accent}>
            <span className="relative">{primaryLabel}</span>
            <PublicIcon name="arrow" className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          {secondaryLabel && secondaryTo && (
            <Link to={secondaryTo} className={PUBLIC_BUTTON.dark}>{secondaryLabel}</Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}

export function FaqDisclosure({ q, a }) {
  return (
    <details className="group rounded-2xl border border-slate-100 bg-white shadow-sm transition-colors open:border-teal-100">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <span className="text-sm font-semibold leading-6 text-slate-950">{q}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-transform group-open:rotate-180 group-open:bg-teal-50 group-open:text-teal-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <p className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-6 text-slate-600">{a}</p>
    </details>
  );
}

export function BlogVisual({ post, featured = false, className = "" }) {
  if (post?.cover_url) {
    return (
      <img
        src={post.cover_url}
        alt={post.cover_alt ?? post.titulo}
        width={1200}
        height={630}
        loading={featured ? "eager" : "lazy"}
        fetchPriority={featured ? "high" : "auto"}
        decoding="async"
        sizes={featured ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 640px) 50vw, 100vw"}
        className={`w-full object-cover ${featured ? "h-64" : "h-44"} ${className}`}
      />
    );
  }
  const asset = getBlogFallbackAsset(post);
  return (
    <img
      src={asset.src}
      alt={post?.titulo ? `Imagen editorial de FichaEleam para ${post.titulo}` : asset.alt}
      width={asset.width}
      height={asset.height}
      loading={featured ? "eager" : "lazy"}
      fetchPriority={featured ? "high" : "auto"}
      decoding="async"
      sizes={featured ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 640px) 50vw, 100vw"}
      className={`w-full object-cover ${featured ? "h-64" : "h-44"} ${className}`}
    />
  );
}

export function CheckList({ items = [], dark = false }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-2.5 text-sm leading-6 ${dark ? "text-slate-300" : "text-slate-700"}`}>
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${dark ? "bg-teal-400/20 text-teal-300" : "bg-teal-50 text-teal-700"}`}>
            <PublicIcon name="check" className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ComplianceBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
      {label}
    </span>
  );
}

// Static credibility band (replaces the scrolling marquee). Honest trust signals:
// Chilean regulatory framework + made-in-Chile + free trial.
export function TrustBand({ items = [], note, srText }) {
  return (
    <div className="relative border-y border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-7">
        <div className="flex flex-col items-center gap-x-8 gap-y-4 sm:flex-row sm:flex-wrap sm:justify-center">
          {note && (
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{note}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {items.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-50">
                  <PublicIcon name="check" className="h-3 w-3 text-teal-700" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      {srText && <p className="sr-only">{srText}</p>}
    </div>
  );
}
