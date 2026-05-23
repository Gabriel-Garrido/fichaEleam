import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPostBySlug, getRelatedPosts, incrementViews } from "./blogService";
import { renderMarkdown, extractTOC } from "./utils/markdown";
import { useSEO, articleJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "../public/PublicShell";

function countWords(md) {
  if (!md) return undefined;
  return md.replace(/[`*#>_![\]()]/g, " ").split(/\s+/).filter(Boolean).length;
}

function formatDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return ""; }
}

function ArticleSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-12 flex flex-col lg:flex-row gap-12">
      <div className="flex-1 space-y-6">
        <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
        <div className="h-10 w-3/4 bg-slate-100 animate-pulse rounded" />
        <div className="h-5 w-full bg-slate-100 animate-pulse rounded" />
        <div className="h-52 w-full bg-slate-100 animate-pulse rounded-2xl" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-100 animate-pulse rounded" style={{ width: `${85 - (i % 3) * 7}%` }} />
          ))}
        </div>
      </div>
      <aside className="lg:w-64 shrink-0">
        <div className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
      </aside>
    </div>
  );
}

export default function PublicBlogPost() {
  const { slug } = useParams();
  const [post, setPost]       = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageView("blog_post", slug);

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

  return (
    <PublicShell current="/blog">
      {({ openDemo }) => {
        if (loading) return <ArticleSkeleton />;

        if (notFound || !post) {
          return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-5 py-20">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Artículo no encontrado</h1>
              <p className="text-slate-500 mb-6 max-w-md">El artículo que buscas fue retirado o no existe.</p>
              <Link
                to="/blog"
                className="bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-all"
              >
                Volver al blog
              </Link>
            </div>
          );
        }

        const toc = extractTOC(post.contenido_md);

        return (
          <div className="bg-white">
            <div className="max-w-5xl mx-auto px-5 py-12 flex flex-col lg:flex-row gap-12">
              <article className="flex-1 min-w-0" itemScope itemType="https://schema.org/BlogPosting">
                <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
                  <Link to="/" className="hover:text-teal-700">Inicio</Link>
                  <span className="mx-2">/</span>
                  <Link to="/blog" className="hover:text-teal-700">Blog</Link>
                  <span className="mx-2">/</span>
                  <span className="text-slate-600 line-clamp-1">{post.titulo}</span>
                </nav>

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
                  <h2 className="text-xl font-black mb-2">Software diseñado para ELEAM en Chile</h2>
                  <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                    Carpeta SEREMI con DS&nbsp;14/2017, fichas clínicas digitales y portal para familias.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openDemo("blog_post_article_demo")}
                      className="bg-teal-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-teal-400 transition-all text-sm"
                    >
                      Solicitar demo gratuito
                    </button>
                    <Link
                      to="/software-eleam"
                      onClick={() => trackEvent("cta_click", "blog_post_software")}
                      className="border border-white/20 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm"
                    >
                      Ver software ELEAM
                    </Link>
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
                <div className="lg:sticky lg:top-24 space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">FichaEleam</p>
                    <h2 className="font-bold leading-tight mb-3 text-sm">
                      Software para tu ELEAM
                    </h2>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      DS&nbsp;14/2017 completo, fichas clínicas y portal para familias.
                    </p>
                    <button
                      type="button"
                      onClick={() => openDemo("blog_post_sidebar_demo")}
                      className="w-full bg-teal-500 text-white font-bold py-2 rounded-xl text-sm hover:bg-teal-400 transition-all"
                    >
                      Solicitar demo
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
          </div>
        );
      }}
    </PublicShell>
  );
}
