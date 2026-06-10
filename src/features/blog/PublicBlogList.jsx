import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSEO, breadcrumbJsonLd, blogListJsonLd } from "../../utils/seo";
import { getPublishedPosts } from "./blogService";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "../public/PublicShell";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "../public/publicDesignAssets";
import { BlogVisual, PublicBadge, PublicBreadcrumb, PublicIcon, Reveal } from "../public/PublicDesign";

const CATEGORY_PILLS = [
  "Decreto N°20",
  "Fiscalización SEREMI",
  "Ficha clínica",
  "Signos vitales",
  "Entrega de turno",
  "Familias",
];

const NORMATIVA = ["Decreto N°20 · MINSAL", "Ley 20.584", "Ley 19.628"];

function formatDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default function PublicBlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  usePageView("/blog");

  useSEO({
    title: "Blog · gestión de ELEAM, Decreto N°20 y cuidado del persona mayor",
    description:
      "Guías prácticas para administradores y personal de ELEAM en Chile: Decreto N°20, fiscalización SEREMI, ficha clínica digital, signos vitales y comunicación con familias.",
    path: "/blog",
    image: PUBLIC_ASSETS.shift.publicSrc,
    keywords: ["blog ELEAM", "Decreto N°20", "fiscalización SEREMI", "persona mayor Chile", "ficha clínica ELEAM"],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Blog", url: "/blog" },
      ]),
      blogListJsonLd(posts),
    ],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getPublishedPosts({ limit: 50 });
        if (active) setPosts(data ?? []);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <PublicShell current="/blog">
      {({ openDemo }) => (
        <div className="bg-white">
          <section className="relative overflow-hidden bg-slate-950 px-5 py-16 text-white sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-teal-500/20 blur-[120px]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 public-grid-pattern opacity-40" />
            <div className="mx-auto max-w-5xl">
              <PublicBreadcrumb current="Blog" />
              <PublicBadge tone="dark">Recursos para ELEAM en Chile</PublicBadge>
              <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Guías para gestionar mejor tu ELEAM
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Contenido práctico sobre Decreto N°20, fiscalización SEREMI, registros clínicos y la operación diaria de las residencias de personas mayores en Chile.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {CATEGORY_PILLS.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-5 py-16">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <p className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">
                No pudimos cargar los artículos. Intenta nuevamente más tarde.
              </p>
            ) : posts.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Aún no hay artículos publicados.
              </p>
            ) : (
              <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
                <div className="space-y-8">
                  {featured && (
                    <Reveal>
                      <Link
                        to={`/blog/${featured.slug}`}
                        onClick={() => trackEvent("cta_click", "blog_featured")}
                        className="group block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative h-64 overflow-hidden sm:h-72">
                          <BlogVisual post={featured} featured className="transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                          <div className="absolute bottom-0 p-6">
                            <span className="inline-flex rounded-full bg-teal-500 px-3 py-1 text-xs font-bold text-white">Destacado</span>
                            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white text-balance">{featured.titulo}</h2>
                          </div>
                        </div>
                        <div className="p-6">
                          <p className="text-sm leading-6 text-slate-600">{featured.resumen}</p>
                          <p className="mt-4 text-xs text-slate-400">
                            {formatDateLong(featured.publicado_en)} · {featured.tiempo_lectura_min ?? 5} min de lectura
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  )}

                  {rest.length > 0 && (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {rest.map((post, i) => (
                        <Reveal key={post.slug} delay={(i % 2) * 70}>
                          <Link
                            to={`/blog/${post.slug}`}
                            onClick={() => trackEvent("cta_click", "blog_card")}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"
                          >
                            <div className="h-44 overflow-hidden">
                              <BlogVisual post={post} className="transition-transform duration-500 group-hover:scale-105" />
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                              {Array.isArray(post.keywords) && post.keywords.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                  {post.keywords.slice(0, 2).map((kw) => (
                                    <span key={kw} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">{kw}</span>
                                  ))}
                                </div>
                              )}
                              <h3 className="font-semibold leading-snug text-slate-950 group-hover:text-teal-800">{post.titulo}</h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.resumen}</p>
                              <p className="mt-auto pt-4 text-xs text-slate-400">
                                {formatDateLong(post.publicado_en)} · {post.tiempo_lectura_min ?? 5} min
                              </p>
                            </div>
                          </Link>
                        </Reveal>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 text-white">
                    <h2 className="font-display text-lg font-semibold">Digitaliza tu ELEAM</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Ficha clínica, signos vitales, turnos y Carpeta SEREMI en un solo lugar. Pruébalo 30 días gratis.
                    </p>
                    <button type="button" onClick={() => openDemo("blog_sidebar")} className={`${PUBLIC_BUTTON.accent} mt-5 w-full`}>
                      Solicitar demo gratis
                    </button>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                    <h2 className="text-sm font-bold text-slate-950">Normativa vigente</h2>
                    <ul className="mt-4 space-y-2">
                      {NORMATIVA.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                          <PublicIcon name="check" className="h-4 w-4 text-teal-600" strokeWidth={2.5} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      )}
    </PublicShell>
  );
}
