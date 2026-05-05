import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPostBySlug, getPublishedPosts, incrementViews } from "./blogService";
import { renderMarkdown, extractTOC } from "./utils/markdown";
import Loading from "../../components/Loading";
import { useSEO, articleJsonLd, breadcrumbJsonLd } from "../../utils/seo";

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
            <Link to="/demo" className="text-gray-500 hover:text-gray-800">Demo</Link>
            <Link to="/register" className="bg-[var(--color-primary)] text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)]">
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10">
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

        {toc.length >= 3 && (
          <aside className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              En este artículo
            </p>
            <ul className="space-y-1">
              {toc.map((h, idx) => (
                <li key={idx} className={h.level === 3 ? "pl-4" : ""}>
                  <a href={`#${h.id}`} className="text-slate-700 hover:text-[var(--color-primary)] hover:underline">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="prose-clean">
          {renderMarkdown(post.contenido_md)}
        </div>

        {/* CTA in-article */}
        <section className="mt-12 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-black mb-1">FichaEleam — listo para tu ELEAM</h3>
          <p className="opacity-90 text-sm mb-4">
            Carpeta SEREMI con los 14 ámbitos pre-cargados, ficha clínica digital,
            signos vitales con rangos clínicos y portal para familias.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/register" className="bg-white text-teal-700 font-bold px-4 py-2 rounded-lg hover:bg-teal-50 text-sm">
              Crear cuenta gratis
            </Link>
            <Link to="/demo" className="border border-white/40 font-bold px-4 py-2 rounded-lg hover:bg-white/10 text-sm">
              Ver el demo
            </Link>
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

      <footer className="border-t border-gray-100 mt-12 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} FichaEleam · Software para ELEAM en Chile
      </footer>
    </div>
  );
}
