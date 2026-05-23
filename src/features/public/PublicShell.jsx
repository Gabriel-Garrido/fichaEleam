import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DemoRequestModal from "../landing/DemoRequestModal";
import WhatsAppLeadButton from "../landing/WhatsAppLeadButton";
import WhatsAppLeadModal from "../landing/WhatsAppLeadModal";
import { trackEvent } from "../landing/landingAnalytics";

const RESOURCE_LINKS = [
  { to: "/acreditacion-seremi", label: "Acreditación SEREMI" },
  { to: "/software-eleam", label: "Software para ELEAM" },
  { to: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { to: "/blog", label: "Blog" },
  { to: "/contacto", label: "Contacto" },
];

function NavLink({ to, children, current, onClick }) {
  const active = current === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-xl transition-all ${
        active
          ? "text-white bg-white/10"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
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

  const openDemo = (cta = "page_demo") => {
    setDemoCta(cta);
    setDemoOpen(true);
    trackEvent("cta_click", cta);
  };
  const openWhatsApp = (source) => {
    setWhatsAppSource(source);
    setWhatsAppOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top nav — dark slate, matches landing */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold text-white tracking-tight"
            onClick={() => trackEvent("nav_click", "logo")}
          >
            Ficha<span className="text-teal-400">Eleam</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {RESOURCE_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                current={path}
                onClick={() => trackEvent("nav_click", l.to)}
              >
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { navigate("/login"); trackEvent("nav_click", "login"); }}
              className="text-sm text-slate-300 border border-white/20 px-4 py-1.5 rounded-xl hover:border-white/40 hover:text-white transition-all ml-2"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => openDemo("nav_demo")}
              className="text-sm bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-400 transition-all font-semibold shadow-lg shadow-teal-500/20 ml-1"
            >
              Solicitar demo
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Abrir menú"
            className="md:hidden text-slate-300 p-2 rounded-xl hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-slate-950 px-5 py-3 space-y-1">
            {RESOURCE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => { setMobileOpen(false); trackEvent("nav_click", l.to); }}
                className={`block px-3 py-2 rounded-xl text-sm ${
                  path === l.to ? "text-white bg-white/10" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-white/5 flex gap-2">
              <button
                type="button"
                onClick={() => { setMobileOpen(false); navigate("/login"); }}
                className="flex-1 text-sm text-slate-300 border border-white/20 px-4 py-2 rounded-xl"
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setMobileOpen(false); openDemo("nav_demo_mobile"); }}
                className="flex-1 text-sm bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold"
              >
                Demo
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main>{typeof children === "function" ? children({ openDemo }) : children}</main>

      {/* Footer — mirrors landing footer */}
      <footer className="bg-slate-950 border-t border-white/5 text-slate-500 py-14 px-5">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-4 gap-10 text-sm">
          <div>
            <span className="text-lg font-bold text-white tracking-tight block mb-3">
              Ficha<span className="text-teal-400">Eleam</span>
            </span>
            <p className="leading-relaxed text-xs text-slate-600">
              Software de gestión clínica y documental para Establecimientos de Larga Estadía para Adultos Mayores en Chile. DS&nbsp;14/2017.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Producto</h4>
            <ul className="space-y-2.5">
              <li><Link to="/software-eleam" className="hover:text-white transition-colors">Software ELEAM</Link></li>
              <li><Link to="/pago" className="hover:text-white transition-colors">Planes y precios</Link></li>
              <li><Link to="/preguntas-frecuentes" className="hover:text-white transition-colors">Preguntas frecuentes</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Recursos</h4>
            <ul className="space-y-2.5">
              <li><Link to="/acreditacion-seremi" className="hover:text-white transition-colors">Acreditación SEREMI</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Contacto</h4>
            <a href="mailto:contacto@fichaeleam.cl" className="text-sm hover:text-white transition-colors block">
              contacto@fichaeleam.cl
            </a>
            <a
              href="https://wa.me/56951187764"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-white transition-colors inline-flex items-center gap-1.5 mt-1.5"
              onClick={() => trackEvent("cta_click", "footer_whatsapp")}
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              +56 9 5118 7764
            </a>
            <p className="text-sm mt-1.5">Santiago, Chile</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-xs text-center text-slate-700">
          © {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.
        </div>
      </footer>

      <DemoRequestModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} defaultCta={demoCta} />
      <WhatsAppLeadButton onOpen={openWhatsApp} />
      <WhatsAppLeadModal
        isOpen={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        source={whatsAppSource}
      />
    </div>
  );
}
