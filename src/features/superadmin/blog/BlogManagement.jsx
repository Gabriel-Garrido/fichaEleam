import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../components/Toast";
import Loading from "../../../components/Loading";
import {
  getAllPosts,
  deletePost,
  publishPost,
} from "../../blog/blogService";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
}

const ESTADO_BADGE = {
  publicado:   "bg-emerald-100 text-emerald-700",
  borrador:    "bg-amber-100 text-amber-800",
  archivado:   "bg-slate-200 text-slate-600",
};

export default function BlogManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos"); // todos | publicado | borrador | archivado
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await getAllPosts());
    } catch (e) {
      toast(e.message ?? "Error cargando posts", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (post) => {
    if (!window.confirm(`Eliminar "${post.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deletePost(post.id);
      toast("Post eliminado.", "success");
      load();
    } catch (e) { toast(e.message ?? "Error", "error"); }
  };

  const handleTogglePublish = async (post) => {
    try {
      await publishPost(post.id, post.estado !== "publicado");
      toast(post.estado === "publicado" ? "Post movido a borrador." : "Post publicado.", "success");
      load();
    } catch (e) { toast(e.message ?? "Error", "error"); }
  };

  const filtered = posts.filter((p) => {
    if (filter !== "todos" && p.estado !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.titulo} ${p.slug} ${(p.keywords ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) return <Loading message="Cargando blog..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <button onClick={() => navigate("/superadmin")} className="text-sm text-gray-500 hover:underline">
            ← Volver a Superadmin
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mt-2">Blog · Gestión</h1>
          <p className="text-sm text-gray-500">
            Crea, edita, publica o archiva los artículos del blog público.
          </p>
        </div>
        <button
          onClick={() => navigate("/superadmin/blog/new")}
          className="bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 text-sm"
        >
          + Nuevo post
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex gap-3 flex-wrap items-center">
        <input
          type="search"
          placeholder="Buscar por título, slug o keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {["todos","publicado","borrador","archivado"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No hay posts con ese filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left">Título</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center">Publicado</th>
                  <th className="px-3 py-2 text-center">Vistas</th>
                  <th className="px-3 py-2 text-center">Modif.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 max-w-md">
                      <p className="font-semibold text-gray-800 truncate">{p.titulo}</p>
                      <p className="text-[11px] text-gray-400 truncate">/blog/{p.slug}</p>
                      {p.destacado && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          Destacado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${ESTADO_BADGE[p.estado] ?? "bg-gray-100"}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">{formatDate(p.publicado_en)}</td>
                    <td className="px-3 py-2 text-center font-semibold tabular-nums">{p.views ?? 0}</td>
                    <td className="px-3 py-2 text-center text-gray-400 text-xs">{formatDate(p.actualizado_en)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/superadmin/blog/${p.id}/edit`)}
                        className="text-slate-700 hover:underline text-xs mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleTogglePublish(p)}
                        className={`text-xs mr-2 ${p.estado === "publicado" ? "text-amber-700" : "text-emerald-700"} hover:underline`}
                      >
                        {p.estado === "publicado" ? "Despublicar" : "Publicar"}
                      </button>
                      {p.estado === "publicado" && (
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs mr-2"
                        >
                          Ver
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-rose-600 hover:underline text-xs"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
