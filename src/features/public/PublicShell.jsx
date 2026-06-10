import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { trackEvent } from "../landing/landingAnalytics";
import { PUBLIC_BUTTON } from "./publicDesignAssets";
import { PublicIcon, Wordmark, WhatsAppGlyph } from "./PublicDesign";

const loadDemoRequestModal = () => import("../landing/DemoRequestModal");
const loadWhatsAppLeadModal = () => import("../landing/WhatsAppLeadModal");
const loadWhatsAppLeadButton = () => import("../landing/WhatsAppLeadButton");

const DemoRequestModal = lazy(loadDemoRequestModal);
const WhatsAppLeadModal = lazy(loadWhatsAppLeadModal);
const WhatsAppLeadButton = lazy(loadWhatsAppLeadButton);

const PRODUCT_NAV = [
  { to: "/software-eleam", label: "Producto", show: "md" },
  { to: "/pago", label: "Precios", show: "sm" },
  { to: "/preguntas-frecuentes", label: "FAQ", show: "lg" },
  { to: "/contacto", label: "Contacto", show: "lg" },
];

const RESOURCE_NAV = [
  { to: "/blog", label: "Blog", description: "Guías prácticas para operar y fiscalizar mejor." },
  { to: "/calculadora-dotacion-eleam", label: "Calculadora", description: "Dotación referencial según Decreto N°20." },
  { to: "/acreditacion-seremi", label: "Guía acreditación SEREMI", description: "Requisitos DS 20 ordenados por ámbito." },
];

const MOBILE_PRIMARY_NAV = [
  { to: "/software-eleam", label: "Producto" },
  { to: "/pago", label: "Precios" },
  { to: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { to: "/contacto", label: "Contacto" },
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

function resourcesActive(path) {
  return RESOURCE_NAV.some((item) => activeFor(path, item.to));
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

function ResourceDropdown({ path }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = resourcesActive(path);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  const closeOnEscape = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      ref={ref}
      className="relative hidden md:inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={closeOnEscape}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="public-resource-menu"
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
          active
            ? "bg-teal-50 text-teal-800"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        }`}
      >
        Recursos gratuitos
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id="public-resource-menu"
          role="menu"
          className="absolute right-0 top-full mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
        >
          {RESOURCE_NAV.map((item) => {
            const itemActive = activeFor(path, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  trackEvent("nav_click", item.to);
                }}
                className={`block rounded-xl px-3 py-3 transition-colors ${
                  itemActive ? "bg-teal-50" : "hover:bg-slate-50"
                }`}
              >
                <span className={`block text-sm font-semibold ${itemActive ? "text-teal-800" : "text-slate-950"}`}>
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FooterLink({ to, children, event }) {
  return (
    <Link
      to={to}
      onClick={() => trackEvent("nav_click", event ?? to)}
      className="text-slate-400 transition-colors hover:text-white"
    >
      {children}
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
  const [floatingWhatsAppReady, setFloatingWhatsAppReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    const start = () => {
      setFloatingWhatsAppReady(true);
      loadWhatsAppLeadButton();
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 2800 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(start, 1800);
    return () => window.clearTimeout(id);
  }, []);

  const preloadDemo = useCallback(() => {
    loadDemoRequestModal();
  }, []);

  const preloadWhatsApp = useCallback(() => {
    loadWhatsAppLeadModal();
  }, []);

  const openDemo = useCallback((cta = "page_demo") => {
    preloadDemo();
    setDemoCta(cta);
    setDemoOpen(true);
    trackEvent("cta_click", cta);
  }, [preloadDemo]);

  const openWhatsApp = useCallback((source) => {
    preloadWhatsApp();
    setWhatsAppSource(source);
    setWhatsAppOpen(true);
    trackEvent("cta_click", `whatsapp_${source}`);
  }, [preloadWhatsApp]);

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
            {PRODUCT_NAV.slice(0, 2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                show={item.show}
                active={activeFor(path, item.to)}
                onClick={() => trackEvent("nav_click", item.to)}
              />
            ))}
            <ResourceDropdown path={path} />
            {PRODUCT_NAV.slice(2).map((item) => (
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
              onMouseEnter={preloadDemo}
              onFocus={preloadDemo}
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
              {MOBILE_PRIMARY_NAV.map((item) => {
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

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Recursos gratuitos
              </p>
              <div className="mt-2 grid gap-1">
                {RESOURCE_NAV.map((item) => {
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
                onMouseEnter={preloadDemo}
                onFocus={preloadDemo}
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
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 public-grid-pattern opacity-25" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-16 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/20 sm:p-10 lg:p-12">
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
                  30 días para ver tu ELEAM digitalizado
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                  Cuenta real con todos los módulos activos. Recibe acceso en menos de 24 horas. Sin tarjeta de crédito.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onMouseEnter={preloadDemo}
                  onFocus={preloadDemo}
                  onClick={() => openDemo("footer_demo")}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-teal-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-300"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">Solicitar demo gratis</span>
                  <PublicIcon name="arrow" className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onMouseEnter={preloadWhatsApp}
                  onFocus={preloadWhatsApp}
                  onClick={() => openWhatsApp("footer")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white"
                >
                  <WhatsAppGlyph className="h-4 w-4 text-emerald-400" />
                  Consultar por WhatsApp
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  Respondemos en menos de 24 horas hábiles
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Brand dark onClick={() => trackEvent("nav_click", "footer_logo")} />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                Software web de gestión clínica, administrativa y de acreditación SEREMI para Establecimientos de Larga Estadía para Personas Mayores en Chile.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Decreto N°20", "Ley 20.584", "Ley 19.628"].map((item) => (
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
                <li><FooterLink to="/software-eleam">Software ELEAM</FooterLink></li>
                <li><FooterLink to="/pago">Planes y precios</FooterLink></li>
                <li><FooterLink to="/preguntas-frecuentes">Preguntas frecuentes</FooterLink></li>
                <li><FooterLink to="/login">Iniciar sesión</FooterLink></li>
              </ul>
            </nav>

            <nav aria-label="Recursos gratuitos">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Recursos gratuitos</h4>
              <ul className="space-y-3">
                <li><FooterLink to="/blog" event="footer_blog">Blog</FooterLink></li>
                <li><FooterLink to="/calculadora-dotacion-eleam" event="footer_calculadora">Calculadora de dotación</FooterLink></li>
                <li><FooterLink to="/acreditacion-seremi" event="footer_seremi">Guía acreditación SEREMI</FooterLink></li>
                <li><FooterLink to="/contacto">Contacto</FooterLink></li>
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

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur-xl transition-transform duration-300 sm:hidden ${
          scrolled ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseEnter={preloadDemo}
            onFocus={preloadDemo}
            onClick={() => openDemo("mobile_bar_demo")}
            className={`${PUBLIC_BUTTON.primary} flex-1`}
          >
            Solicitar demo gratis
          </button>
          <button
            type="button"
            onMouseEnter={preloadWhatsApp}
            onFocus={preloadWhatsApp}
            onClick={() => openWhatsApp("mobile_bar")}
            aria-label="Consultar por WhatsApp"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
          >
            <WhatsAppGlyph className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Suspense fallback={null}>
        {demoOpen && (
          <DemoRequestModal
            isOpen={demoOpen}
            onClose={() => setDemoOpen(false)}
            defaultCta={demoCta}
          />
        )}
        {whatsAppOpen && (
          <WhatsAppLeadModal
            isOpen={whatsAppOpen}
            onClose={() => setWhatsAppOpen(false)}
            source={whatsAppSource}
          />
        )}
        {floatingWhatsAppReady && (
          <div className="hidden sm:block">
            <WhatsAppLeadButton onOpen={openWhatsApp} />
          </div>
        )}
      </Suspense>
    </div>
  );
}
