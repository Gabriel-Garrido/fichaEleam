import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import FilterBar from "../../components/FilterBar";
import { friendlyError } from "../../utils/errorMessages";
import { useFilterParams } from "../../hooks/useFilterParams";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import { FeatureCoach } from "../featureCoach";
import {
  getObservaciones,
  crearObservacion,
  cerrarObservacion,
} from "./accreditationService";
import { formatDate } from "../../utils/dateUtils";

const FILTROS_ESTADO = [
  { key: "abiertas",  label: "Abiertas" },
  { key: "cerradas",  label: "Cerradas" },
  { key: "todas",     label: "Todas" },
];

const FILTROS_ORIGEN = [
  { key: "todas",         label: "Todas" },
  { key: "interna",       label: "Internas" },
  { key: "fiscalizacion", label: "Fiscalización" },
];

function NuevaForm({ onCreated, onCancel, isAdmin }) {
  const toast = useToast();
  const [origen, setOrigen] = useState("interna");
  const [descripcion, setDescripcion] = useState("");
  const [acciones, setAcciones] = useState("");
  const [fechaCompromiso, setFechaCompromiso] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await crearObservacion({
        requisitoEleamId: null,
        origen,
        descripcion,
        accionesSubsanacion: acciones,
        fechaCompromiso,
      });
      toast("Observación registrada", "success");
      onCreated?.();
    } catch (err) {
      toast(friendlyError(err, "No se pudo registrar la observación. Intenta de nuevo."), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-orange-900">Nueva observación general</h2>
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:underline">
          Cerrar
        </button>
      </div>
      <p className="text-sm text-orange-800">
        Para observaciones específicas de un requisito, abre el requisito y registra la observación allí.
      </p>

      {isAdmin && (
        <div>
          <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Origen</label>
          <select
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="interna">Interna</option>
            <option value="fiscalizacion">Fiscalización</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Descripción *</label>
        <textarea
          rows={3}
          required
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Acciones de subsanación</label>
        <textarea
          rows={2}
          value={acciones}
          onChange={(e) => setAcciones(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs uppercase font-semibold text-orange-700 mb-1 block">Fecha compromiso</label>
        <Input type="date" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={onCancel}
          className="border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy || !descripcion.trim()}
          className="bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 text-sm disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

function ObsRow({ obs, onCerrar, onIr, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);

  const isAbierta = obs.estado === "abierta" || obs.estado === "en_proceso";

  const submit = async () => {
    setBusy(true);
    try { await onCerrar(obs.id, nota); setOpen(false); }
    finally { setBusy(false); }
  };

  const r = obs.requisito_eleam?.requisito;

  return (
    <div className={`border rounded-xl p-4 ${
      obs.origen === "fiscalizacion" ? "border-rose-200 bg-rose-50" : "border-orange-200 bg-orange-50"
    }`}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[10px] uppercase font-bold text-slate-700">
          {obs.origen === "fiscalizacion" ? "Fiscalización" : "Interna"}
        </span>
        <span className={`text-[10px] uppercase font-bold rounded-full px-2 py-0.5 ${
          obs.estado === "cerrada" ? "bg-emerald-100 text-emerald-700" :
          obs.estado === "en_proceso" ? "bg-amber-100 text-amber-700" :
          "bg-rose-100 text-rose-700"
        }`}>{obs.estado}</span>
        <span className="text-xs text-slate-500">{formatDate(obs.fecha)}</span>
        {r && (
          <button
            type="button"
            onClick={() => onIr(obs.requisito_eleam_id)}
            className="text-xs text-teal-700 hover:underline"
          >
            {r.codigo} · {r.nombre}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-800">{obs.descripcion}</p>
      {obs.acciones_subsanacion && (
        <p className="text-xs text-slate-600 mt-1">
          <strong>Subsanación:</strong> {obs.acciones_subsanacion}
        </p>
      )}
      {obs.fecha_compromiso && (
        <p className="text-xs text-slate-600">
          <strong>Compromiso:</strong> {formatDate(obs.fecha_compromiso)}
        </p>
      )}
      {obs.estado === "cerrada" && (
        <p className="text-xs text-emerald-700 mt-1">
          Cerrada {formatDate(obs.cerrada_en)}
          {obs.cerrador?.nombre ? ` por ${obs.cerrador.nombre}` : ""}
          {obs.cerrada_nota ? ` — ${obs.cerrada_nota}` : ""}
        </p>
      )}
      {isAbierta && isAdmin && (!open ? (
        <button type="button"
 onClick={() => setOpen(true)} className="text-xs text-teal-700 hover:underline mt-2 font-semibold">
          Cerrar observación
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            rows={2}
            placeholder="Nota de cierre"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button type="button"
 onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">Cancelar</button>
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl disabled:opacity-50"
            >
              {busy ? "Cerrando..." : "Cerrar"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccreditationObservaciones() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { isAdminEleam } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obsFilters, setObsFilter, clearObsFilters] = useFilterParams({
    schema: { q: "string", estado: "string", origen: "string" },
    defaults: { q: "", estado: "abiertas", origen: "todas" },
  });
  const filtroEstado = obsFilters.estado || "abiertas";
  const filtroOrigen = obsFilters.origen || "todas";
  const busqueda = obsFilters.q ?? "";
  const [showNueva, setShowNueva] = useState(params.get("nuevo") === "1");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getObservaciones();
      setList(data);
    } catch (e) {
      toast(friendlyError(e, "No se pudieron cargar las observaciones. Recarga la página."), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return list.filter((o) => {
      if (filtroEstado === "abiertas" && o.estado === "cerrada") return false;
      if (filtroEstado === "cerradas" && o.estado !== "cerrada") return false;
      if (filtroOrigen !== "todas" && o.origen !== filtroOrigen) return false;
      if (q) {
        const text = [
          o.descripcion, o.acciones_subsanacion, o.cerrada_nota,
          o.requisito_eleam?.requisito?.codigo, o.requisito_eleam?.requisito?.nombre,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [list, filtroEstado, filtroOrigen, busqueda]);

  const handleCerrar = async (id, nota) => {
    try {
      await cerrarObservacion(id, nota);
      toast("Observación cerrada", "success");
      await load();
    } catch (e) { toast(friendlyError(e, "No se pudo cerrar la observación. Intenta de nuevo."), "error"); }
  };

  if (loading) return <Loading message="Cargando observaciones..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <FeatureCoach featureId="accreditation-observaciones" standalone />
      <button
        type="button"
        onClick={() => navigate("/cumplimiento")}
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← Carpeta SEREMI
      </button>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Observaciones</h1>
          <p className="text-sm text-slate-500">
            Registro de hallazgos internos y de fiscalizaciones, con sus acciones de subsanación.
          </p>
        </div>
        {isAdminEleam && !showNueva && (
          <Button
            onClick={() => setShowNueva(true)}
            className="bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800 text-sm"
          >
            + Nueva observación
          </Button>
        )}
      </header>

      {showNueva && (
        <NuevaForm
          isAdmin={isAdminEleam}
          onCancel={() => { setShowNueva(false); params.delete("nuevo"); setParams(params, { replace: true }); }}
          onCreated={() => { setShowNueva(false); load(); }}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <FilterBar
          search={busqueda}
          onSearchChange={(v) => setObsFilter("q", v)}
          searchPlaceholder="Buscar por descripción, requisito o subsanación..."
          filters={[]}
          values={obsFilters}
          onFilterChange={setObsFilter}
          onClearAll={clearObsFilters}
          resultCount={filtered.length}
          totalCount={list.length}
          loading={loading}
        >
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {FILTROS_ESTADO.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setObsFilter("estado", f.key)}
                  aria-pressed={filtroEstado === f.key}
                  className={`tap-highlight-none text-sm px-3 py-1.5 rounded-full border ${
                    filtroEstado === f.key
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {FILTROS_ORIGEN.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setObsFilter("origen", f.key)}
                  aria-pressed={filtroOrigen === f.key}
                  className={`tap-highlight-none text-sm px-3 py-1.5 rounded-full border ${
                    filtroOrigen === f.key
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </FilterBar>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500">
          No hay observaciones con estos filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <ObsRow
              key={o.id}
              obs={o}
              onCerrar={handleCerrar}
              onIr={(reId) => navigate(`/cumplimiento/requisito/${reId}`)}
              isAdmin={isAdminEleam}
            />
          ))}
        </div>
      )}
    </div>
  );
}
