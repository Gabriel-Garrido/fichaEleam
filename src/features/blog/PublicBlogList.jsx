import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublishedPosts } from "./blogService";
import Loading from "../../components/Loading";
import { useSEO, breadcrumbJsonLd } from "../../utils/seo";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return ""; }
}

function PostCard({ post, featured = false }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block bg-white rounded-2xl border border-gray-100 hover:shadow-lg shadow-sm transition-all overflow-hidden ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      {post.cover_url ? (
        <img
          src={post.cover_url}
          alt={post.cover_alt ?? post.titulo}
          className="w-full h-44 object-cover bg-slate-100"
          loading="lazy"
        />
      ) : (
        <div className={`bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white ${featured ? "h-44" : "h-32"} flex items-end`}>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
            FichaEleam · blog
          </span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
          <time dateTime={post.publicado_en}>{formatDate(post.publicado_en)}</time>
          <span>·</span>
          <span>{post.tiempo_lectura_min ?? 5} min de lectura</span>
        </div>
        <h2 className={`font-black text-gray-800 group-hover:text-[var(--color-primary)] transition-colors leading-tight ${
          featured ? "text-2xl mb-2" : "text-lg mb-2"
        }`}>
          {post.titulo}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-3">{post.resumen}</p>
        {post.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.keywords.slice(0, 3).map((k) => (
              <span key={k} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Blog · gestión de ELEAM, fiscalización SEREMI y cuidado del adulto mayor",
    description:
      "Guías prácticas para administradores de ELEAM en Chile: DS 14/2017, fiscalización SEREMI, ficha clínica digital, signos vitales en adultos mayores y comunicación con familias.",
    path: "/blog",
    keywords: ["blog ELEAM", "DS 14/2017", "fiscalización SEREMI", "adulto mayor", "Chile"],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Blog", url: "/blog" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Blog FichaEleam",
        "description": "Recursos para Establecimientos de Larga Estadía para Adultos Mayores en Chile.",
        "url": "https://app.fichaeleam.cl/blog",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-black text-[var(--color-primary)] tracking-tight"
          >
            FichaEleam
          </button>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/demo" className="text-gray-500 hover:text-gray-800">Demo</Link>
            <Link to="/pago" className="text-gray-500 hover:text-gray-800">Planes</Link>
            <Link to="/login" className="text-gray-500 hover:text-gray-800">Iniciar sesión</Link>
            <Link to="/register" className="bg-[var(--color-primary)] text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)]">
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Blog · FichaEleam
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mt-4 mb-3">
            Guías para gestionar tu ELEAM en Chile
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Recursos prácticos sobre fiscalización SEREMI, DS 14/2017, ficha clínica
            digital, cuidado del adulto mayor y comunicación con familias.
            Escritos por y para directores y personal de Establecimientos de Larga Estadía.
          </p>
        </div>

        {loading ? <Loading message="Cargando artículos..." /> : (
          posts.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aún no publicamos artículos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {posts.map((p, idx) => (
                <PostCard key={p.id} post={p} featured={idx === 0 && p.destacado} />
              ))}
            </div>
          )
        )}

        {/* CTA bottom */}
        <section className="mt-16 bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-black mb-2">¿Listo para digitalizar tu ELEAM?</h2>
          <p className="opacity-90 mb-4">
            Activa tu cuenta y arma la Carpeta SEREMI en menos de un día.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="bg-white text-teal-700 font-bold px-5 py-2.5 rounded-xl hover:bg-teal-50"
            >
              Crear cuenta gratis
            </Link>
            <Link
              to="/demo"
              className="border border-white/40 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/10"
            >
              Probar el demo
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} FichaEleam · Software para ELEAM en Chile
      </footer>
    </div>
  );
}
