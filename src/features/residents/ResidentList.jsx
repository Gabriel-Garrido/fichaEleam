import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getResidents, deleteResident } from "./residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const ESTADO_CONFIG = {
  activo:        { label: "Activo",        badge: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  hospitalizado: { label: "Hospitalizado", badge: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500"   },
  egresado:      { label: "Egresado",      badge: "bg-gray-100 text-gray-700 border-gray-200",          dot: "bg-gray-400"    },
  fallecido:     { label: "Fallecido",     badge: "bg-rose-100 text-rose-800 border-rose-200",          dot: "bg-rose-500"    },
};

const DEPENDENCIA_TONE = {
  leve:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderado: "bg-amber-50 text-amber-700 border-amber-200",
  severo:   "bg-orange-50 text-orange-700 border-orange-200",
  total:    "bg-rose-50 text-rose-700 border-rose-200",
};

function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const fn = new Date(fechaNacimiento);
  if (isNaN(fn)) return null;
  const today = new Date();
  let age = today.getFullYear() - fn.getFullYear();
  const m = today.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < fn.getDate())) age--;
  return age;
}

export default function ResidentList() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { can } = useAuth();
  const canDelete = can("eliminar_residentes");
  const canCreate = can("crear_residentes");

  const [residents,    setResidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda,     setBusqueda]     = useState("");
  const [view,         setView]         = useState("grid"); // grid | list

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResidents(filtroEstado || null);
      setResidents(data);
    } catch {
      setError("No se pudo cargar la lista de residentes.");
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a ${nombre}?\nEsta acción eliminará también todos sus registros.`)) return;
    try {
      await deleteResident(id);
      setResidents((prev) => prev.filter((r) => r.id !== id));
      toast(`${nombre} eliminado correctamente.`, "success");
    } catch {
      toast("No se pudo eliminar el residente.", "error");
    }
  };

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) =>
      r.nombre.toLowerCase().includes(q) ||
      r.apellido.toLowerCase().includes(q) ||
      (r.rut ?? "").toLowerCase().includes(q)
    );
  }, [residents, busqueda]);

  const stats = useMemo(() => {
    const out = { total: residents.length, activo: 0, hospitalizado: 0, egresado: 0, fallecido: 0 };
    for (const r of residents) if (r.estado in out) out[r.estado]++;
    return out;
  }, [residents]);

  if (loading) return <Loading message="Cargando residentes..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">Residentes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total} residente{stats.total !== 1 ? "s" : ""} registrado
            {stats.total !== 1 ? "s" : ""}
            {filtroEstado && ` · filtrando por ${ESTADO_CONFIG[filtroEstado]?.label.toLowerCase() ?? filtroEstado}`}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => navigate("/residents/new")}
            className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg hover:bg-[var(--color-button-hover)] transition-all font-medium shadow-sm"
          >
            + Agregar Residente
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={fetchResidents} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

      {/* Stats / chips de filtro rápido por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <StatChip
          label="Total"
          value={stats.total}
          tone="primary"
          active={filtroEstado === ""}
          onClick={() => setFiltroEstado("")}
        />
        <StatChip
          label="Activos"
          value={stats.activo}
          tone="emerald"
          active={filtroEstado === "activo"}
          onClick={() => setFiltroEstado(filtroEstado === "activo" ? "" : "activo")}
        />
        <StatChip
          label="Hospitalizados"
          value={stats.hospitalizado}
          tone="amber"
          active={filtroEstado === "hospitalizado"}
          onClick={() => setFiltroEstado(filtroEstado === "hospitalizado" ? "" : "hospitalizado")}
        />
        <StatChip
          label="Egresados"
          value={stats.egresado}
          tone="gray"
          active={filtroEstado === "egresado"}
          onClick={() => setFiltroEstado(filtroEstado === "egresado" ? "" : "egresado")}
        />
        <StatChip
          label="Fallecidos"
          value={stats.fallecido}
          tone="rose"
          active={filtroEstado === "fallecido"}
          onClick={() => setFiltroEstado(filtroEstado === "fallecido" ? "" : "fallecido")}
        />
      </div>

      {/* Toolbar: búsqueda + selector vista */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            placeholder="Buscar por nombre, apellido o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden self-start sm:self-auto">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 text-xs font-medium ${
              view === "grid"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 ${
              view === "list"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100">
          <div className="text-6xl mb-4">👴</div>
          <p className="text-lg font-medium text-gray-600">
            {busqueda || filtroEstado
              ? "Sin resultados para esta búsqueda."
              : "No hay residentes registrados."}
          </p>
          {!busqueda && !filtroEstado && (
            <Button
              onClick={() => navigate("/residents/new")}
              className="mt-6 bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg hover:bg-[var(--color-button-hover)]"
            >
              Agregar primer residente
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ResidentCard
              key={r.id}
              resident={r}
              onView={() => navigate(`/residents/${r.id}`)}
              onEdit={() => navigate(`/residents/${r.id}/edit`)}
              onDelete={canDelete ? () => handleDelete(r.id, `${r.nombre} ${r.apellido}`) : null}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <ResidentRow
              key={r.id}
              resident={r}
              onView={() => navigate(`/residents/${r.id}`)}
              onEdit={() => navigate(`/residents/${r.id}/edit`)}
              onDelete={canDelete ? () => handleDelete(r.id, `${r.nombre} ${r.apellido}`) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── StatChip ───────────────────────────────────────────────── */

const TONE = {
  primary: { bg: "bg-white",        text: "text-[var(--color-primary)]", accent: "text-gray-500",     ring: "ring-[var(--color-secondary)]" },
  emerald: { bg: "bg-emerald-50",   text: "text-emerald-700",            accent: "text-emerald-600",  ring: "ring-emerald-200"            },
  amber:   { bg: "bg-amber-50",     text: "text-amber-800",              accent: "text-amber-600",    ring: "ring-amber-200"              },
  rose:    { bg: "bg-rose-50",      text: "text-rose-700",               accent: "text-rose-600",     ring: "ring-rose-200"               },
  gray:    { bg: "bg-gray-50",      text: "text-gray-700",               accent: "text-gray-500",     ring: "ring-gray-200"               },
};

function StatChip({ label, value, tone, active, onClick }) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border border-gray-100 ${t.bg} px-4 py-3 shadow-sm transition-all hover:shadow-md ${
        active ? `ring-2 ${t.ring}` : ""
      }`}
    >
      <div className={`text-xs font-medium ${t.accent}`}>{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${t.text}`}>{value}</div>
    </button>
  );
}

/* ─── Tarjeta de residente (grid) ───────────────────────────── */

function ResidentCard({ resident: r, onView, onEdit, onDelete }) {
  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.activo;
  const age = calcAge(r.fecha_nacimiento);
  return (
    <article
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-[var(--color-secondary)] transition-all flex flex-col cursor-pointer"
      onClick={onView}
    >
      <div className="h-2 bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-accent)]" />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white font-bold shadow-sm">
            {initials(r.nombre, r.apellido)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 truncate">
              {r.nombre} {r.apellido}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${estado.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
                {estado.label}
              </span>
              {age != null && (
                <span className="text-xs text-gray-500">{age} años</span>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-xs">
          {r.rut && (
            <Field label="RUT" value={r.rut} />
          )}
          {r.habitacion && (
            <Field
              label="Ubicación"
              value={`Hab. ${r.habitacion}${r.cama ? ` · Cama ${r.cama}` : ""}`}
            />
          )}
          {r.fecha_ingreso && (
            <Field
              label="Ingreso"
              value={new Date(r.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL")}
            />
          )}
          {r.nivel_dependencia && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                Dependencia
              </dt>
              <dd>
                <span
                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full border capitalize ${
                    DEPENDENCIA_TONE[r.nivel_dependencia] ?? "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {r.nivel_dependencia}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {r.diagnostico_principal && (
          <p className="text-xs text-gray-500 mt-3 italic line-clamp-2">
            {r.diagnostico_principal}
          </p>
        )}

        {r.alergias?.length > 0 && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 border border-rose-100 px-2 py-1">
            <span aria-hidden className="text-rose-500 text-xs">⚠️</span>
            <span className="text-[11px] text-rose-700 line-clamp-1">
              <span className="font-semibold">Alergias:</span> {r.alergias.join(", ")}
            </span>
          </div>
        )}

        <div className="mt-auto pt-4 flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="text-xs text-gray-600 hover:text-[var(--color-primary)] hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Editar
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Eliminar
            </button>
          )}
          <Button
            onClick={onView}
            className="text-xs bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)] shadow-sm"
          >
            Ver ficha →
          </Button>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-700 truncate">{value}</dd>
    </div>
  );
}

/* ─── Fila lista compacta ────────────────────────────────────── */

function ResidentRow({ resident: r, onView, onEdit, onDelete }) {
  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.activo;
  const age = calcAge(r.fecha_nacimiento);
  return (
    <div
      onClick={onView}
      className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md hover:border-[var(--color-secondary)] transition-all cursor-pointer"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white font-bold">
        {initials(r.nombre, r.apellido)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-800 truncate">
            {r.apellido}, {r.nombre}
          </h3>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${estado.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
            {estado.label}
          </span>
        </div>
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
          {age != null && <span>{age} años</span>}
          {r.rut && <span>RUT: {r.rut}</span>}
          {r.habitacion && (
            <span>Hab. {r.habitacion}{r.cama ? ` · Cama ${r.cama}` : ""}</span>
          )}
          {r.nivel_dependencia && <span className="capitalize">Dep.: {r.nivel_dependencia}</span>}
        </div>
      </div>

      <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={onView}
          className="text-sm bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)] transition-all"
        >
          Ver
        </Button>
        <Button
          onClick={onEdit}
          className="text-sm bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
        >
          Editar
        </Button>
        {onDelete && (
          <Button
            onClick={onDelete}
            className="text-sm bg-white text-red-500 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-all"
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
