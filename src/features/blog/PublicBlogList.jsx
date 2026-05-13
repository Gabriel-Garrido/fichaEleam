import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublishedPosts } from "./blogService";
import Loading from "../../components/Loading";
import { useSEO, breadcrumbJsonLd } from "../../utils/seo";
import DemoRequestModal from "../landing/DemoRequestModal";
import { trackEvent } from "../landing/landingAnalytics";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return ""; }
}

function PostCard({ post, featured = false }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block bg-white rounded-2xl border border-slate-100 hover:border-teal-100 hover:shadow-lg transition-all duration-200 overflow-hidden ${featured ? "md:col-span-2" : ""}`}
    >
      {post.cover_url ? (
        <img
          src={post.cover_url}
          alt={post.cover_alt ?? post.titulo}
          className={`w-full object-cover bg-slate-100 ${featured ? "h-52" : "h-40"}`}
          loading="lazy"
        />
      ) : (
        <div className={`bg-gradient-to-br from-teal-600 to-teal-800 ${featured ? "h-52" : "h-40"} flex items-end p-5`}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-teal-300">FichaEleam</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
          <time dateTime={post.publicado_en}>{formatDate(post.publicado_en)}</time>
          <span>·</span>
          <span>{post.tiempo_lectura_min ?? 5} min de lectura</span>
        </div>
        <h2 className={`font-black text-slate-900 group-hover:text-teal-600 transition-colors leading-tight mb-2 ${featured ? "text-2xl" : "text-lg"}`}>
          {post.titulo}
        </h2>
        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{post.resumen}</p>
        {post.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.keywords.slice(0, 3).map((k) => (
              <span key={k} className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                {k}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function PublicBlogList() {
  const navigate = useNavigate();
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);

  useSEO({
    title: "Blog · gestión de ELEAM, DS 14/2017 y cuidado del adulto mayor en Chile",
    description: "Guías prácticas para administradores y personal de ELEAM en Chile: DS 14/2017, fiscalización SEREMI, ficha clínica digital, signos vitales en adultos mayores y comunicación con familias.",
    path: "/blog",
    keywords: ["blog ELEAM", "DS 14/2017", "fiscalización SEREMI", "adulto mayor Chile", "ficha clínica ELEAM"],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Blog",   url: "/blog" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Blog FichaEleam",
        description: "Recursos para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile: gestión clínica, DS 14/2017 y acreditación SEREMI.",
        url: "https://app.fichaeleam.cl/blog",
        publisher: {
          "@type": "Organization",
          name: "FichaEleam",
          url: "https://app.fichaeleam.cl",
        },
        inLanguage: "es-CL",
      },
    ],
  });

  useEffect(() => {
    let mounted = true;
    getPublishedPosts({ limit: 50 })
      .then((p) => mounted && setPosts(p))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-lg font-bold text-white tracking-tight"
          >
            Ficha<span className="text-teal-400">Eleam</span>
          </button>
          <div className="flex items-center gap-1">
            <Link
              to="/blog"
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              Blog
            </Link>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-slate-300 border border-white/20 px-4 py-1.5 rounded-lg hover:border-white/40 hover:text-white transition-all ml-1"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setModal(true); trackEvent("cta_click", "blog_list_nav_demo"); }}
              className="hidden sm:inline-flex text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-400 transition-all font-semibold shadow-lg shadow-teal-500/20 ml-1"
            >
              Solicitar Demo
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 py-16 sm:py-24">
        <div className="text-center mb-14">
          <span className="inline-block bg-teal-50 text-teal-700 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5">
            Blog · FichaEleam
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight mb-4">
            Guías para gestionar
            <br className="hidden sm:block" />
            tu ELEAM en Chile
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Recursos sobre DS&nbsp;14/2017, fiscalización SEREMI, ficha clínica digital,
            cuidado del adulto mayor y comunicación con familias.
            Para directores y personal de Establecimientos de Larga Estadía.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1">
            {loading ? (
              <Loading message="Cargando artículos..." />
            ) : posts.length === 0 ? (
              <p className="text-center text-slate-400 py-16">Aún no publicamos artículos.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {posts.map((p, idx) => (
                  <PostCard key={p.id} post={p} featured={idx === 0 && p.destacado} />
                ))}
              </div>
            )}
          </div>

          <aside className="lg:w-72 shrink-0">
            <div className="bg-slate-900 rounded-2xl p-6 text-white sticky top-24">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-3">
                ¿Buscas gestionar mejor tu ELEAM?
              </p>
              <h3 className="font-bold text-lg leading-tight mb-3">
                Digitaliza tu Carpeta SEREMI y ficha clínica
              </h3>
              <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                FichaEleam incluye los 14 ámbitos del DS&nbsp;14/2017 pre-cargados.
              </p>
              <button
                onClick={() => { setModal(true); trackEvent("cta_click", "blog_list_sidebar_demo"); }}
                className="w-full bg-teal-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-teal-400 transition-all"
              >
                Solicitar Demo Gratuito
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">Sin compromiso · 24 h de respuesta</p>
            </div>
          </aside>
        </div>

        <section className="mt-16 bg-slate-950 rounded-2xl p-8 sm:p-10 text-white text-center">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Empieza hoy</p>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            ¿Listo para digitalizar tu ELEAM?
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            30 días gratis · Sin tarjeta de crédito · Respuesta en 24 horas
          </p>
          <button
            onClick={() => { setModal(true); trackEvent("cta_click", "blog_list_bottom_demo"); }}
            className="bg-teal-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-teal-400 transition-all"
          >
            Solicitar Demo Gratuito
          </button>
        </section>
      </main>

      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta="blog_list_cta" />

      <footer className="bg-slate-950 border-t border-white/5 py-10 px-5 text-center mt-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate("/")} className="text-lg font-bold text-white tracking-tight">
            Ficha<span className="text-teal-400">Eleam</span>
          </button>
          <p className="mt-2 text-xs text-slate-600">
            © {new Date().getFullYear()} FichaEleam · Software para ELEAM en Chile
          </p>
        </div>
      </footer>
    </div>
  );
}
