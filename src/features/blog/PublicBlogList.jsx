import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublishedPosts } from "./blogService";
import { useSEO, breadcrumbJsonLd, blogListJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "../public/PublicShell";

function formatDateLong(iso) {
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
          <time dateTime={post.publicado_en}>{formatDateLong(post.publicado_en)}</time>
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

function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="h-40 bg-slate-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-32 bg-slate-100 animate-pulse rounded" />
        <div className="h-5 w-3/4 bg-slate-100 animate-pulse rounded" />
        <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
        <div className="h-3 w-5/6 bg-slate-100 animate-pulse rounded" />
      </div>
    </div>
  );
}

export default function PublicBlogList() {
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  usePageView("blog_list");

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
      blogListJsonLd(posts),
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
    <PublicShell current="/blog">
      {({ openDemo }) => (
        <div className="bg-white">
          <section className="max-w-5xl mx-auto px-5 py-16 sm:py-20">
            <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-teal-700">Inicio</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-600">Blog</span>
            </nav>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)}
                  </div>
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
                <div className="bg-slate-900 rounded-2xl p-6 text-white lg:sticky lg:top-24">
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-3">
                    ¿Buscas gestionar mejor tu ELEAM?
                  </p>
                  <h2 className="font-bold text-lg leading-tight mb-3">
                    Digitaliza tu Carpeta SEREMI y ficha clínica
                  </h2>
                  <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                    FichaEleam incluye los 14 ámbitos del DS&nbsp;14/2017 pre-cargados.
                  </p>
                  <button
                    type="button"
                    onClick={() => openDemo("blog_list_sidebar_demo")}
                    className="w-full bg-teal-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-teal-400 transition-all"
                  >
                    Solicitar demo gratuito
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">Sin tarjeta · 24 h de respuesta</p>
                  <div className="mt-5 pt-5 border-t border-white/10 space-y-2 text-sm">
                    <Link
                      to="/acreditacion-seremi"
                      onClick={() => trackEvent("nav_click", "blog_sidebar_seremi")}
                      className="block text-slate-300 hover:text-white transition-colors"
                    >
                      → Guía SEREMI completa
                    </Link>
                    <Link
                      to="/software-eleam"
                      onClick={() => trackEvent("nav_click", "blog_sidebar_software")}
                      className="block text-slate-300 hover:text-white transition-colors"
                    >
                      → Software para ELEAM
                    </Link>
                    <Link
                      to="/preguntas-frecuentes"
                      onClick={() => trackEvent("nav_click", "blog_sidebar_faq")}
                      className="block text-slate-300 hover:text-white transition-colors"
                    >
                      → Preguntas frecuentes
                    </Link>
                  </div>
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
                type="button"
                onClick={() => openDemo("blog_list_bottom_demo")}
                className="bg-teal-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-teal-400 transition-all"
              >
                Solicitar demo gratuito
              </button>
            </section>
          </section>
        </div>
      )}
    </PublicShell>
  );
}
