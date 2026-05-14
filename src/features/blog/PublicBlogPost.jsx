import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPostBySlug, getRelatedPosts } from "./blogService";
import { renderMarkdown, extractTOC } from "./utils/markdown";
import Loading from "../../components/Loading";
import { useSEO, articleJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import DemoRequestModal from "../landing/DemoRequestModal";
import { trackEvent } from "../landing/landingAnalytics";
import { incrementViews } from "./blogService";

function countWords(md) {
  if (!md) return undefined;
  return md.replace(/[`*#>_![\]()]/g, " ").split(/\s+/).filter(Boolean).length;
}

// Formatea fechas con mes en texto largo, solo para la UI del artículo
function formatDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return ""; }
}

export default function PublicBlogPost() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const [post, setPost]       = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal]     = useState(false);

  const wordCount = post ? countWords(post.contenido_md) : undefined;

  useSEO(post ? {
    title:         post.meta_title       ?? post.titulo,
    description:   post.meta_description ?? post.resumen,
    path:          `/blog/${post.slug}`,
    image:         post.cover_url,
    type:          "article",
    keywords:      post.keywords ?? [],
    publishedTime: post.publicado_en,
    modifiedTime:  post.actualizado_en,
    author:        post.autor_nombre,
    jsonLd: [
      articleJsonLd({
        titulo:        post.titulo,
        resumen:       post.resumen,
        slug:          post.slug,
        image:         post.cover_url,
        publicadoEn:   post.publicado_en,
        actualizadoEn: post.actualizado_en,
        autor:         post.autor_nombre,
        keywords:      post.keywords,
        wordCount,
      }),
      breadcrumbJsonLd([
        { name: "Inicio",    url: "/" },
        { name: "Blog",      url: "/blog" },
        { name: post.titulo, url: `/blog/${post.slug}` },
      ]),
    ],
  } : { title: "Cargando artículo…", description: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    getPostBySlug(slug)
      .then((p) => {
        if (!mounted) return;
        if (!p || p.estado !== "publicado") { setNotFound(true); return; }
        setPost(p);
        incrementViews(p.slug);
        return getRelatedPosts(p.slug, p.keywords ?? []);
      })
      .then((rel) => mounted && rel && setRelated(rel.slice(0, 3)))
      .catch(() => mounted && setNotFound(true))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <Loading message="Cargando artículo..." />;

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-5">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Artículo no encontrado</h1>
        <p className="text-slate-500 mb-6">El artículo que buscas fue retirado o no existe.</p>
        <Link
          to="/blog"
          className="bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-500 transition-all"
        >
          Volver al blog
        </Link>
      </div>
    );
  }

  const toc = extractTOC(post.contenido_md);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button type="button" onClick={() => navigate("/")} className="text-lg font-bold text-white tracking-tight">
            Ficha<span className="text-teal-400">Eleam</span>
          </button>
          <div className="flex items-center gap-1">
            <Link
              to="/blog"
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              Blog
            </Link>
            <button type="button"
              onClick={() => navigate("/login")}
              className="text-sm text-slate-300 border border-white/20 px-4 py-1.5 rounded-lg hover:border-white/40 hover:text-white transition-all ml-1"
            >
              Iniciar sesión
            </button>
            <button type="button"
              onClick={() => { setModal(true); trackEvent("cta_click", "blog_post_nav_demo"); }}
              className="hidden sm:inline-flex text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-400 transition-all font-semibold shadow-lg shadow-teal-500/20 ml-1"
            >
              Solicitar Demo
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-12 flex flex-col lg:flex-row gap-12">
        <article className="flex-1 min-w-0" itemScope itemType="https://schema.org/BlogPosting">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-600 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Volver al blog
          </Link>

          <header className="mb-8">
            {post.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Etiquetas del artículo">
                {post.keywords.slice(0, 4).map((k) => (
                  <span
                    key={k}
                    className="text-[10px] uppercase tracking-wider bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-bold"
                    itemProp="keywords"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4"
              itemProp="headline"
            >
              {post.titulo}
            </h1>
            <p
              className="text-lg text-slate-500 leading-relaxed mb-5 article-summary"
              itemProp="description"
            >
              {post.resumen}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 border-t border-slate-100 pt-4">
              <span className="font-semibold text-slate-700" itemProp="author" itemScope itemType="https://schema.org/Person">
                <span itemProp="name">{post.autor_nombre ?? "Equipo FichaEleam"}</span>
              </span>
              <span>·</span>
              <time dateTime={post.publicado_en} itemProp="datePublished">{formatDateLong(post.publicado_en)}</time>
              {post.actualizado_en && post.actualizado_en !== post.publicado_en && (
                <time dateTime={post.actualizado_en} itemProp="dateModified" className="sr-only">
                  {formatDateLong(post.actualizado_en)}
                </time>
              )}
              <span>·</span>
              <span>{post.tiempo_lectura_min ?? 5} min de lectura</span>
              {wordCount && <span className="sr-only" itemProp="wordCount">{wordCount}</span>}
            </div>
          </header>

          {post.cover_url && (
            <img
              src={post.cover_url}
              alt={post.cover_alt ?? post.titulo}
              className="w-full rounded-2xl mb-8 border border-slate-100"
              loading="eager"
              itemProp="image"
            />
          )}

          <div className="prose-clean" itemProp="articleBody">
            {renderMarkdown(post.contenido_md)}
          </div>

          <section className="mt-14 bg-slate-900 rounded-2xl p-6 sm:p-8 text-white">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">FichaEleam</p>
            <h3 className="text-xl font-black mb-2">Software diseñado para ELEAM en Chile</h3>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Carpeta SEREMI con DS&nbsp;14/2017, fichas clínicas digitales y portal para familias.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => { setModal(true); trackEvent("cta_click", "blog_post_article_demo"); }}
                className="bg-teal-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-teal-400 transition-all text-sm"
              >
                Solicitar Demo Gratuito
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.titulo} – ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/20 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartir en WhatsApp
              </a>
            </div>
          </section>

          {related.length > 0 && (
            <section className="mt-12" aria-label="Artículos relacionados">
              <h2 className="text-lg font-bold text-slate-900 mb-5">Sigue leyendo</h2>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/blog/${r.slug}`}
                      className="block bg-white border border-slate-100 rounded-xl p-4 hover:border-teal-100 hover:shadow-sm transition-all"
                    >
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{r.titulo}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{r.resumen}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">FichaEleam</p>
              <h3 className="font-bold leading-tight mb-3 text-sm">
                Software para tu ELEAM
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                DS&nbsp;14/2017 completo, fichas clínicas y portal para familias.
              </p>
              <button type="button"
                onClick={() => { setModal(true); trackEvent("cta_click", "blog_post_sidebar_demo"); }}
                className="w-full bg-teal-500 text-white font-bold py-2 rounded-xl text-sm hover:bg-teal-400 transition-all"
              >
                Solicitar Demo
              </button>
            </div>

            {toc && toc.length >= 3 && (
              <nav aria-label="Contenido del artículo" className="bg-slate-50 border border-slate-100 rounded-xl p-4 hidden lg:block">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">En este artículo</p>
                <ul className="space-y-2">
                  {toc.map((h, idx) => (
                    <li key={idx} className={h.level === 3 ? "pl-3" : ""}>
                      <a
                        href={`#${h.id}`}
                        className="text-xs text-slate-600 hover:text-teal-600 transition-colors leading-snug block"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </aside>
      </div>

      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta="blog_post_cta" />

      <footer className="bg-slate-950 border-t border-white/5 py-10 px-5 text-center mt-8">
        <div className="max-w-6xl mx-auto">
          <button type="button" onClick={() => navigate("/")} className="text-lg font-bold text-white tracking-tight">
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
