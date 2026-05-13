import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../utils/errorMessages";
import Loading from "../../components/Loading";
import {
  getMyResidentes,
  getRecentVitals,
  getRecentObservations,
  getVisits,
  logVisit,
} from "./familiarService";
import { VITAL_DEFS, recordOverallStatus, STATUS } from "../vitalSigns/vitalRanges";
import { TIPO_LABEL, calcAge } from "../residents/residentUtils";
import { formatDateTime } from "../../utils/dateUtils";

function ResidentBadgeRow({ res }) {
  const age = calcAge(res.fecha_nacimiento);
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-teal-700 text-white flex items-center justify-center font-black text-lg">
          {(res.nombre?.[0] ?? "") + (res.apellido?.[0] ?? "")}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-slate-800 text-xl truncate">
            {res.nombre} {res.apellido}
          </h2>
          <p className="text-sm text-slate-500">
            {age != null && <>{age} años · </>}
            {res.parentesco ? <>Tu vínculo: <span className="font-semibold">{res.parentesco}</span></> : "Familiar autorizado"}
          </p>
          {(res.habitacion || res.cama) && (
            <p className="text-xs text-slate-400 mt-0.5">
              Habitación {res.habitacion ?? "—"} · Cama {res.cama ?? "—"}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          res.estado === "activo"        ? "bg-emerald-100 text-emerald-700" :
          res.estado === "hospitalizado" ? "bg-amber-100 text-amber-800" :
                                          "bg-slate-100 text-slate-600"
        }`}>
          {res.estado ?? "—"}
        </span>
      </div>
    </div>
  );
}

function VitalsBlock({ vitals }) {
  if (!vitals?.length) {
    return <p className="text-sm text-slate-500">Sin registros de signos vitales aún.</p>;
  }
  const latest = vitals[0];
  const overall = recordOverallStatus(latest);
  const overallStyle = STATUS[overall] ?? STATUS.unknown;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          Último registro · {formatDateTime(latest.fecha_hora)}
        </p>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${overallStyle.badge}`}>
          {overallStyle.label}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(VITAL_DEFS).map(([key, def]) => {
          const status = def.statusFor(latest);
          const s = STATUS[status] ?? STATUS.unknown;
          const value = key === "presion"
            ? def.format(latest.presion_sistolica, latest.presion_diastolica)
            : def.format(
                latest[
                  key === "fc"      ? "frecuencia_cardiaca" :
                  key === "fr"      ? "frecuencia_respiratoria" :
                  key === "temp"    ? "temperatura" :
                  key === "spo2"    ? "saturacion_oxigeno" :
                  key === "glucosa" ? "glucosa" :
                  key === "dolor"   ? "dolor_escala" : key
                ]
              );
          return (
            <div key={key} className={`rounded-xl border p-3 bg-white ${s.ring} ring-1`}>
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide truncate">
                {def.icon} {def.label}
              </p>
              <p className={`text-lg font-black truncate ${s.text}`}>
                {value} <span className="text-xs font-semibold text-slate-400">{def.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ObservationsBlock({ obs }) {
  if (!obs?.length) {
    return <p className="text-sm text-slate-500">Sin observaciones recientes.</p>;
  }
  return (
    <ul className="divide-y">
      {obs.map((o) => (
        <li key={o.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-700 line-clamp-3">
                {o.descripcion}
              </p>
              {o.acciones_tomadas && (
                <p className="text-xs text-slate-500 mt-1">
                  Acciones: {o.acciones_tomadas}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">
                {TIPO_LABEL[o.tipo] ?? o.tipo}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(o.fecha_hora)}</p>
              {o.requiere_seguimiento && (
                <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Seguimiento
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FamiliarPortal() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, eleam } = useAuth();
  const [residentes, setResidentes] = useState([]);
  const [activeId,   setActiveId]   = useState(null);
  const [vitals,     setVitals]     = useState([]);
  const [obs,        setObs]        = useState([]);
  const [visitas,    setVisitas]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [logging,    setLogging]    = useState(false);

  const fetchAll = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [v, o, vis] = await Promise.all([
        getRecentVitals(id, 1),
        getRecentObservations(id, 10),
        getVisits(id, 10),
      ]);
      setVitals(v);
      setObs(o);
      setVisitas(vis);
    } catch (e) {
      toast(friendlyError(e, "No se pudo cargar la información del residente. Intenta de nuevo."), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMyResidentes()
      .then((r) => {
        if (!mounted) return;
        setResidentes(r);
        const id = r[0]?.id ?? null;
        setActiveId(id);
        if (id) fetchAll(id);
        else setLoading(false);
      })
      .catch((e) => {
        if (mounted) {
          toast(friendlyError(e, "No se pudo cargar la información. Recarga la página."), "error");
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [fetchAll, toast]);

  const handleLogVisit = async () => {
    if (!activeId) return;
    setLogging(true);
    try {
      await logVisit({ residenteId: activeId });
      toast("Visita registrada", "success");
      const fresh = await getVisits(activeId, 10);
      setVisitas(fresh);
    } catch (e) {
      toast(friendlyError(e, "No se pudo registrar la visita. Intenta de nuevo."), "error");
    } finally {
      setLogging(false);
    }
  };

  if (loading && residentes.length === 0) {
    return <Loading message="Cargando información del residente..." />;
  }

  if (residentes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Sin residentes asignados</h1>
        <p className="text-slate-500 mb-4">
          Aún no estás vinculado a un residente. Pide al administrador del ELEAM
          que cree el vínculo o vuelva a generar la invitación.
        </p>
      </div>
    );
  }

  const activeRes = residentes.find((r) => r.id === activeId) ?? residentes[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-2xl font-black text-slate-800">
          Hola{profile?.nombre ? `, ${profile.nombre.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Aquí puedes ver el estado y los últimos registros de tu familiar
          {eleam?.nombre ? <> en <span className="font-semibold">{eleam.nombre}</span></> : null}.
        </p>
      </header>

      {/* Selector de residente (en caso de tener varios) */}
      {residentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {residentes.map((r) => (
            <button
              key={r.id}
              onClick={() => { setActiveId(r.id); fetchAll(r.id); }}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${
                r.id === activeId
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.nombre} {r.apellido}
            </button>
          ))}
        </div>
      )}

      <ResidentBadgeRow res={activeRes} />

      {/* Signos vitales */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">Signos vitales</h2>
        </div>
        <VitalsBlock vitals={vitals} />
      </section>

      {/* Observaciones */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-3">Últimas observaciones</h2>
        <ObservationsBlock obs={obs} />
      </section>

      {/* Visitas */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold text-slate-800">Mis visitas recientes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/familiar/visitas")}
              className="text-sm text-teal-700 hover:underline"
            >
              Ver todas
            </button>
            <button
              onClick={handleLogVisit}
              disabled={logging}
              className="bg-teal-700 text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-teal-800 disabled:opacity-50"
            >
              {logging ? "Guardando..." : "Registrar visita ahora"}
            </button>
          </div>
        </div>
        {visitas.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no tienes visitas registradas.</p>
        ) : (
          <ul className="divide-y">
            {visitas.slice(0, 5).map((v) => (
              <li key={v.id} className="py-2 text-sm">
                <span className="font-semibold text-slate-700">{formatDateTime(v.fecha_hora)}</span>
                {v.duracion_min ? <span className="text-slate-500"> · {v.duracion_min} min</span> : null}
                {v.notas ? <p className="text-slate-500 text-xs mt-0.5">{v.notas}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
