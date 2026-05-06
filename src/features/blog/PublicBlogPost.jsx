import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPostBySlug, getPublishedPosts, incrementViews } from "./blogService";
import { renderMarkdown, extractTOC } from "./utils/markdown";
import Loading from "../../components/Loading";
import { useSEO, articleJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import DemoRequestModal from "../landing/DemoRequestModal";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return ""; }
}

export default function PublicBlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState(false);

  // SEO dinámico (debe llamarse incondicionalmente; los datos se actualizan con el post)
  useSEO(post ? {
    title: post.meta_title ?? post.titulo,
    description: post.meta_description ?? post.resumen,
    path: `/blog/${post.slug}`,
    image: post.cover_url,
    type: "article",
    keywords: post.keywords ?? [],
    jsonLd: [
      articleJsonLd({
        titulo: post.titulo,
        resumen: post.resumen,
        slug: post.slug,
        image: post.cover_url,
        publicadoEn: post.publicado_en,
        actualizadoEn: post.actualizado_en,
        autor: post.autor_nombre,
        keywords: post.keywords,
      }),
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Blog",   url: "/blog" },
        { name: post.titulo, url: `/blog/${post.slug}` },
      ]),
    ],
  } : {
    title: "Cargando artículo…",
    description: "",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    Promise.all([getPostBySlug(slug), getPublishedPosts({ limit: 4 })])
      .then(([p, others]) => {
        if (!mounted) return;
        if (!p || p.estado !== "publicado") { setNotFound(true); return; }
        setPost(p);
        setRelated((others ?? []).filter((o) => o.slug !== p.slug).slice(0, 3));
        // contar vista (no bloquea)
        incrementViews(p.slug);
      })
      .catch(() => mounted && setNotFound(true))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <Loading message="Cargando artículo..." />;

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Artículo no encontrado</h1>
        <p className="text-gray-500 mb-6">El artículo que buscas fue retirado o no existe.</p>
        <Link to="/blog" className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl">
          Volver al blog
        </Link>
      </div>
    );
  }

  const toc = extractTOC(post.contenido_md);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-black text-[var(--color-primary)] tracking-tight"
          >
            FichaEleam
          </button>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/blog" className="text-gray-500 hover:text-gray-800">Blog</Link>
            <Link to="/login" className="text-gray-500 hover:text-gray-800">Iniciar sesión</Link>
            <button
              onClick={() => setModal(true)}
              className="bg-teal-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-teal-700"
            >
              Solicitar Demo
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col lg:flex-row gap-10">
      <article className="flex-1 min-w-0">
        <Link to="/blog" className="text-sm text-gray-500 hover:underline">← Volver al blog</Link>

        <header className="mt-4 mb-8">
          {post.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.keywords.slice(0, 4).map((k) => (
                <span key={k} className="text-[10px] uppercase tracking-wider bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">
                  {k}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4">
            {post.titulo}
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">{post.resumen}</p>
          <div className="flex items-center gap-3 mt-5 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <span className="font-semibold text-gray-700">{post.autor_nombre ?? "Equipo FichaEleam"}</span>
            <span>·</span>
            <time dateTime={post.publicado_en}>{formatDate(post.publicado_en)}</time>
            <span>·</span>
            <span>{post.tiempo_lectura_min ?? 5} min</span>
          </div>
        </header>

        {post.cover_url && (
          <img
            src={post.cover_url}
            alt={post.cover_alt ?? post.titulo}
            className="w-full rounded-2xl mb-8"
            loading="eager"
          />
        )}

        <div className="prose-clean">
          {renderMarkdown(post.contenido_md)}
        </div>

        {/* CTA in-article */}
        <section className="mt-12 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-black mb-1">¿Este artículo fue útil?</h3>
          <p className="opacity-90 text-sm mb-4">
            Conoce cómo FichaEleam puede ayudarte: carpeta DS 14/2017, fichas clínicas y portal para familias.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal(true)}
              className="bg-white text-teal-700 font-bold px-4 py-2 rounded-lg hover:bg-teal-50 text-sm"
            >
              Solicitar Demo Gratuito
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${post.titulo} – ${window.location.href}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/40 font-bold px-4 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartir en WhatsApp
            </a>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Sigue leyendo</h2>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link to={`/blog/${r.slug}`} className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all">
                    <p className="font-semibold text-gray-800">{r.titulo}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.resumen}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      {/* Blog sidebar */}
      <aside className="lg:w-64 shrink-0">
        <div className="sticky top-20 space-y-4">
          {post && (
            <div className="bg-teal-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-200 mb-2">
                ¿Te interesa este tema?
              </p>
              <h3 className="font-bold leading-tight mb-3 text-sm">
                FichaEleam — la plataforma para tu ELEAM
              </h3>
              <p className="text-xs text-teal-100 mb-4 leading-relaxed">
                DS 14/2017 completo, fichas clínicas y portal para familias.
              </p>
              <button
                onClick={() => setModal(true)}
                className="w-full bg-white text-teal-700 font-bold py-2 rounded-xl text-sm hover:bg-teal-50"
              >
                Solicitar Demo
              </button>
            </div>
          )}
          {toc && toc.length >= 3 && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm hidden lg:block">
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">En este artículo</p>
              <ul className="space-y-1.5">
                {toc.map((h, idx) => (
                  <li key={idx} className={h.level === 3 ? "pl-3" : ""}>
                    <a href={`#${h.id}`} className="text-gray-600 hover:text-teal-600 hover:underline text-xs">{h.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
      </div>
      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta="blog_post_cta" />

      <footer className="border-t border-gray-100 mt-12 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} FichaEleam · Software para ELEAM en Chile
      </footer>
    </div>
  );
}
