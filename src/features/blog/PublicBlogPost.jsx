import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { renderMarkdown, extractTOC } from "./utils/markdown";
import { useSEO, articleJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "../public/PublicShell";
import { PUBLIC_BUTTON, getBlogFallbackAsset } from "../public/publicDesignAssets";
import {
  BlogVisual,
  PublicBadge,
  PublicCtaBand,
} from "../public/PublicDesign";

function countWords(md) {
  if (!md) return undefined;
  return md.replace(/[`*#>_![\]()]/g, " ").split(/\s+/).filter(Boolean).length;
}

function formatDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <aside className="hidden lg:block">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </aside>
    </div>
  );
}

function RelatedCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group grid gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-teal-200 hover:shadow-md sm:grid-cols-[140px_1fr]">
      <BlogVisual post={post} className="h-28 rounded-xl" />
      <div className="min-w-0 py-1">
        <p className="text-xs text-slate-500">{formatDateLong(post.publicado_en)}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-950 group-hover:text-teal-700">{post.titulo}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{post.resumen}</p>
      </div>
    </Link>
  );
}

export default function PublicBlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageView("blog_post", slug);

  const wordCount = post ? countWords(post.contenido_md) : undefined;
  const fallbackAsset = post ? getBlogFallbackAsset(post) : null;
  const seoImage = post?.cover_url || fallbackAsset?.publicSrc;

  useSEO(post ? {
    title: post.meta_title ?? post.titulo,
    description: post.meta_description ?? post.resumen,
    path: `/blog/${post.slug}`,
    image: seoImage,
    type: "article",
    keywords: post.keywords ?? [],
    publishedTime: post.publicado_en,
    modifiedTime: post.actualizado_en ?? post.publicado_en,
    author: post.autor_nombre,
    jsonLd: [
      articleJsonLd({
        titulo: post.titulo,
        resumen: post.resumen,
        slug: post.slug,
        image: seoImage,
        publicadoEn: post.publicado_en,
        actualizadoEn: post.actualizado_en ?? post.publicado_en,
        autor: post.autor_nombre,
        keywords: post.keywords,
        wordCount,
      }),
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: post.titulo, url: `/blog/${post.slug}` },
      ]),
    ],
  } : { title: "Cargando artículo...", description: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const { getPostBySlug, getRelatedPosts, incrementViews } = await import("./blogService");
        const item = await getPostBySlug(slug);
        if (!mounted) return;
        if (!item || item.estado !== "publicado") {
          setNotFound(true);
          return;
        }
        setPost(item);
        incrementViews(item.slug);
        const items = await getRelatedPosts(item.slug, item.keywords ?? []);
        if (mounted && items) setRelated(items.slice(0, 3));
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  return (
    <PublicShell current="/blog">
      {({ openDemo }) => {
        if (loading) return <ArticleSkeleton />;

        if (notFound || !post) {
          return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-20 text-center">
              <h1 className="text-2xl font-semibold text-slate-950">Artículo no encontrado</h1>
              <p className="mt-2 max-w-md text-slate-500">El artículo que buscas fue retirado o no existe.</p>
              <Link to="/blog" className={`${PUBLIC_BUTTON.primary} mt-6`}>Volver al blog</Link>
            </div>
          );
        }

        const toc = extractTOC(post.contenido_md);

        return (
          <div className="bg-white">
            <article itemScope itemType="https://schema.org/BlogPosting">
              <section className="bg-slate-50 px-5 py-12 sm:py-16">
                <div className="mx-auto max-w-5xl">
                  <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
                    <Link to="/" className="font-medium hover:text-teal-700">Inicio</Link>
                    <span className="text-slate-300">/</span>
                    <Link to="/blog" className="font-medium hover:text-teal-700">Blog</Link>
                    <span className="text-slate-300">/</span>
                    <span className="line-clamp-1 text-slate-800">{post.titulo}</span>
                  </nav>

                  {post.keywords?.length > 0 && (
                    <div className="mb-5 flex flex-wrap gap-2" aria-label="Etiquetas del artículo">
                      {post.keywords.slice(0, 5).map((keyword) => (
                        <PublicBadge key={keyword} tone="teal" className="tracking-[0.08em]" itemProp="keywords">
                          {keyword}
                        </PublicBadge>
                      ))}
                    </div>
                  )}

                  <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl" itemProp="headline">
                    {post.titulo}
                  </h1>
                  <p className="article-summary mt-5 max-w-3xl text-lg leading-8 text-slate-600" itemProp="description">
                    {post.resumen}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 text-sm text-slate-500">
                    <span className="font-semibold text-slate-800" itemProp="author" itemScope itemType="https://schema.org/Person">
                      <span itemProp="name">{post.autor_nombre ?? "Equipo FichaEleam"}</span>
                    </span>
                    <span>·</span>
                    <time dateTime={post.publicado_en} itemProp="datePublished">{formatDateLong(post.publicado_en)}</time>
                    <time dateTime={post.actualizado_en ?? post.publicado_en} itemProp="dateModified" className="sr-only">
                      {formatDateLong(post.actualizado_en ?? post.publicado_en)}
                    </time>
                    <span>·</span>
                    <span>{post.tiempo_lectura_min ?? 5} min de lectura</span>
                    {wordCount && <span className="sr-only" itemProp="wordCount">{wordCount}</span>}
                  </div>
                </div>
              </section>

              <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0">
                  <figure className="mb-10 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <BlogVisual post={post} featured className="h-[320px] sm:h-[420px]" />
                    <figcaption className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                      {post.cover_alt ?? `Imagen editorial de FichaEleam para ${post.titulo}`}
                    </figcaption>
                  </figure>

                  <div className="prose-clean" itemProp="articleBody">
                    {renderMarkdown(post.contenido_md)}
                  </div>

                  <section className="mt-14 rounded-3xl border border-slate-100 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">FichaEleam</p>
                    <h2 className="mt-3 text-2xl font-semibold">Software diseñado para ELEAM en Chile</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                      Carpeta SEREMI Decreto N°20, fichas clínicas digitales, signos vitales, turnos y portal familiar.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => openDemo("blog_post_article_demo")} className={PUBLIC_BUTTON.primary}>
                        Solicitar demo gratis
                      </button>
                      <Link to="/software-eleam" onClick={() => trackEvent("cta_click", "blog_post_software")} className={PUBLIC_BUTTON.dark}>
                        Ver software ELEAM
                      </Link>
                    </div>
                  </section>

                  {related.length > 0 && (
                    <section className="mt-12" aria-label="Artículos relacionados">
                      <h2 className="mb-5 text-xl font-semibold text-slate-950">Sigue leyendo</h2>
                      <div className="grid gap-3">
                        {related.map((item) => <RelatedCard key={item.id} post={item} />)}
                      </div>
                    </section>
                  )}
                </div>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">En este artículo</p>
                      {toc && toc.length >= 3 ? (
                        <nav className="mt-4" aria-label="Contenido del artículo">
                          <ul className="space-y-2">
                            {toc.map((heading, index) => (
                              <li key={`${heading.id}-${index}`} className={heading.level === 3 ? "pl-3" : ""}>
                                <a href={`#${heading.id}`} className="block text-xs leading-5 text-slate-600 hover:text-teal-700">
                                  {heading.text}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-slate-500">Guía breve para lectura directa.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Demo</p>
                      <h2 className="mt-2 text-base font-semibold text-slate-950">Prueba FichaEleam con tu ELEAM</h2>
                      <p className="mt-2 text-xs leading-5 text-slate-600">Cuenta real por 30 días, sin tarjeta de crédito.</p>
                      <button type="button" onClick={() => openDemo("blog_post_sidebar_demo")} className={`${PUBLIC_BUTTON.primary} mt-4 w-full py-2`}>
                        Solicitar demo
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </article>

            <PublicCtaBand
              title="Convierte esta guía en operación diaria"
              text="FichaEleam lleva la gestión clínica y documental a una cuenta real, con módulos preparados para ELEAM en Chile."
              primaryLabel="Solicitar demo gratis"
              onPrimary={openDemo}
              source="blog_post_bottom_demo"
              secondaryLabel="Ver guía SEREMI"
              secondaryTo="/acreditacion-seremi"
            />
          </div>
        );
      }}
    </PublicShell>
  );
}
