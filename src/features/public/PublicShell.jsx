import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DemoRequestModal from "../landing/DemoRequestModal";
import WhatsAppLeadButton from "../landing/WhatsAppLeadButton";
import WhatsAppLeadModal from "../landing/WhatsAppLeadModal";
import { trackEvent } from "../landing/landingAnalytics";
import { PUBLIC_BUTTON } from "./publicDesignAssets";
import { PublicIcon, Wordmark, WhatsAppGlyph } from "./PublicDesign";

const PRIMARY_NAV = [
  { to: "/software-eleam", label: "Producto", show: "md" },
  { to: "/acreditacion-seremi", label: "SEREMI", show: "md" },
  { to: "/pago", label: "Precios", show: "sm" },
  { to: "/blog", label: "Blog", show: "md" },
  { to: "/preguntas-frecuentes", label: "FAQ", show: "lg" },
];

const ALL_NAV = [
  ...PRIMARY_NAV,
  { to: "/contacto", label: "Contacto", show: "always" },
];

const SHOW_CLASS = {
  always: "inline-flex",
  sm: "hidden sm:inline-flex",
  md: "hidden md:inline-flex",
  lg: "hidden lg:inline-flex",
};

function activeFor(path, to) {
  return path === to || (to === "/blog" && path.startsWith("/blog"));
}

function NavLink({ to, label, show, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${SHOW_CLASS[show] ?? "inline-flex"} rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-teal-50 text-teal-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {label}
    </Link>
  );
}

function Brand({ onClick, dark = false }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="inline-flex min-w-0 items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      aria-label="FichaEleam · Inicio"
    >
      <Wordmark variant={dark ? "dark" : "light"} className="h-8 sm:h-9" />
    </Link>
  );
}

export default function PublicShell({ children, current }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = current ?? location.pathname;
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoCta, setDemoCta] = useState("page_demo");
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [whatsAppSource, setWhatsAppSource] = useState("floating");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [path]);

  const openDemo = (cta = "page_demo") => {
    setDemoCta(cta);
    setDemoOpen(true);
    trackEvent("cta_click", cta);
  };

  const openWhatsApp = (source) => {
    setWhatsAppSource(source);
    setWhatsAppOpen(true);
    trackEvent("cta_click", `whatsapp_${source}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <nav
        className={`sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl transition-shadow ${
          scrolled ? "shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)]" : ""
        }`}
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
          <Brand onClick={() => trackEvent("nav_click", "logo")} />

          <div className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                show={item.show}
                active={activeFor(path, item.to)}
                onClick={() => trackEvent("nav_click", item.to)}
              />
            ))}
            <button
              type="button"
              onClick={() => { navigate("/login"); trackEvent("nav_click", "login"); }}
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => openDemo("nav_demo")}
              className={`${PUBLIC_BUTTON.primary} hidden px-4 py-2 sm:inline-flex`}
            >
              Solicitar demo
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-nav"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? "M6 18 18 6M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"} />
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="public-mobile-nav" className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
            <div className="grid gap-1">
              {ALL_NAV.map((item) => {
                const active = activeFor(path, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => trackEvent("nav_click", item.to)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      active ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={PUBLIC_BUTTON.secondary}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => openDemo("nav_demo_mobile")}
                className={PUBLIC_BUTTON.primary}
              >
                Demo
              </button>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content">
        {typeof children === "function" ? children({ openDemo, openWhatsApp }) : children}
      </main>

      <footer className="relative isolate overflow-hidden bg-slate-950 px-5 pb-24 pt-20 text-slate-400 sm:pb-10">
        {/* Mesh background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-teal-600/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[460px] translate-x-1/4 translate-y-1/4 rounded-full bg-emerald-600/8 blur-[100px]" />
        </div>
        {/* Dot pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 public-grid-pattern opacity-30" />

        <div className="relative mx-auto max-w-7xl">

          {/* ── Big CTA panel ── */}
          <div className="mb-16 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-950/40 p-8 backdrop-blur-sm sm:p-10 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/[0.06] px-3 py-1.5">
                  <span className="relative grid h-2 w-2 place-items-center">
                    <span className="absolute h-2 w-2 animate-ping rounded-full bg-teal-400/70" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-teal-400" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-300">
                    Comenzar
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  30 días para ver tu ELEAM<br className="hidden sm:block" /> digitalizado al 100%
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                  Cuenta real con todos los módulos activos. Recibe acceso en menos de 24 horas. Sin tarjeta de crédito, sin compromisos.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => openDemo("footer_demo")}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-teal-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-300"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">Solicitar demo gratuito</span>
                  <svg className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsApp("footer")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white"
                >
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.12 1.511 5.855L.057 23.82a.5.5 0 0 0 .61.61l5.962-1.453A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75A9.75 9.75 0 1 1 12 2.25a9.75 9.75 0 0 1 0 19.5z"/>
                  </svg>
                  Consultar por WhatsApp
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  Respondemos en menos de 24 horas hábiles
                </p>
              </div>
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="grid gap-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Brand dark onClick={() => trackEvent("nav_click", "footer_logo")} />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                Software web de gestión clínica, administrativa y de acreditación SEREMI para Establecimientos de Larga Estadía para Personas Mayores en Chile.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Decreto N°20",
                  "Ley 20.584",
                  "Ley 19.628",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] font-semibold text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <nav aria-label="Producto">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Producto</h4>
              <ul className="space-y-3">
                <li><Link to="/software-eleam" className="text-slate-400 transition-colors hover:text-white">Software ELEAM</Link></li>
                <li><Link to="/pago" className="text-slate-400 transition-colors hover:text-white">Planes y precios</Link></li>
                <li><Link to="/preguntas-frecuentes" className="text-slate-400 transition-colors hover:text-white">Preguntas frecuentes</Link></li>
                <li><Link to="/login" className="text-slate-400 transition-colors hover:text-white">Iniciar sesión</Link></li>
              </ul>
            </nav>

            <nav aria-label="Recursos">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Recursos</h4>
              <ul className="space-y-3">
                <li><Link to="/acreditacion-seremi" className="text-slate-400 transition-colors hover:text-white">Acreditación SEREMI</Link></li>
                <li><Link to="/calculadora-dotacion-eleam" className="text-slate-400 transition-colors hover:text-white">Calculadora de dotación</Link></li>
                <li><Link to="/blog" className="text-slate-400 transition-colors hover:text-white">Blog ELEAM</Link></li>
                <li><Link to="/contacto" className="text-slate-400 transition-colors hover:text-white">Contacto</Link></li>
              </ul>
            </nav>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Por qué FichaEleam</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="flex gap-2">
                  <PublicIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" strokeWidth={2.5} />
                  <span>Diseñado para ELEAM en Chile</span>
                </li>
                <li className="flex gap-2">
                  <PublicIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" strokeWidth={2.5} />
                  <span>Apoya evidencia normativa vigente</span>
                </li>
                <li className="flex gap-2">
                  <PublicIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" strokeWidth={2.5} />
                  <span>Soporte chileno en español</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ── SEO tag cloud ── */}
          <div className="mt-16 border-t border-white/5 pt-10">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              También buscado como
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Software para ELEAM Chile", to: "/software-eleam" },
                { label: "Carpeta SEREMI digital", to: "/acreditacion-seremi" },
                { label: "Decreto N°20 ELEAM", to: "/acreditacion-seremi" },
                { label: "Ficha clínica persona mayor", to: "/software-eleam" },
                { label: "Signos vitales geriatría", to: "/software-eleam" },
                { label: "Entrega de turno residencia", to: "/software-eleam" },
                { label: "Portal familiar ELEAM", to: "/software-eleam" },
                { label: "eMAR persona mayor", to: "/software-eleam" },
                { label: "Plan de cuidado ELEAM", to: "/software-eleam" },
                { label: "Software residencia persona mayor", to: "/software-eleam" },
                { label: "Sistema acreditación SEREMI", to: "/acreditacion-seremi" },
                { label: "Calculadora dotación ELEAM", to: "/calculadora-dotacion-eleam" },
                { label: "Dotación de personal Decreto 20", to: "/calculadora-dotacion-eleam" },
                { label: "Software geriátrico Chile", to: "/software-eleam" },
                { label: "Habitaciones y camas ELEAM", to: "/software-eleam" },
                { label: "Permisos por rol ELEAM", to: "/software-eleam" },
                { label: "Fiscalización SEREMI ELEAM", to: "/acreditacion-seremi" },
              ].map((tag) => (
                <Link
                  key={tag.label}
                  to={tag.to}
                  onClick={() => trackEvent("nav_click", `footer_tag_${tag.label}`)}
                  className="rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-teal-700/40 hover:bg-teal-500/[0.04] hover:text-teal-300"
                >
                  {tag.label}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="mt-12 flex flex-col gap-3 border-t border-white/5 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              <span>Diseñado en Chile</span>
              <span className="text-slate-700">·</span>
              <span>100% web</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA bar — keeps the primary action in reach on small screens */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur-xl transition-transform duration-300 sm:hidden ${
          scrolled ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDemo("mobile_bar_demo")}
            className={`${PUBLIC_BUTTON.primary} flex-1`}
          >
            Solicitar demo gratis
          </button>
          <button
            type="button"
            onClick={() => openWhatsApp("mobile_bar")}
            aria-label="Consultar por WhatsApp"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
          >
            <WhatsAppGlyph className="h-5 w-5" />
          </button>
        </div>
      </div>

      <DemoRequestModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} defaultCta={demoCta} />
      <div className="hidden sm:block">
        <WhatsAppLeadButton onOpen={openWhatsApp} />
      </div>
      <WhatsAppLeadModal
        isOpen={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        source={whatsAppSource}
      />
    </div>
  );
}
