import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import {
  getMyResidentes,
  getVisits,
  logVisit,
} from "./familiarService";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function localNowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function FamiliarVisitas() {
  const navigate = useNavigate();
  const toast = useToast();
  const [residentes, setResidentes] = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [visitas, setVisitas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [form, setForm] = useState({
    fecha_hora: localNowForInput(),
    duracion_min: "",
    notas: "",
  });

  const loadVisits = useCallback(async (id) => {
    if (!id) return;
    try {
      const v = await getVisits(id, 100);
      setVisitas(v);
    } catch (e) {
      toast(e.message || "Error", "error");
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMyResidentes()
      .then(async (r) => {
        if (!mounted) return;
        setResidentes(r);
        const id = r[0]?.id ?? null;
        setActiveId(id);
        if (id) await loadVisits(id);
      })
      .catch((e) => mounted && toast(e.message || "Error", "error"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [loadVisits, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeId) return;
    setSaving(true);
    try {
      await logVisit({
        residenteId: activeId,
        fechaHora: form.fecha_hora ? new Date(form.fecha_hora).toISOString() : undefined,
        duracionMin: form.duracion_min ? Number(form.duracion_min) : null,
        notas: form.notas,
      });
      toast("Visita registrada", "success");
      setForm({ fecha_hora: localNowForInput(), duracion_min: "", notas: "" });
      await loadVisits(activeId);
    } catch (err) {
      toast(err.message || "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando visitas..." />;
  if (residentes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sin residentes asignados</h1>
        <p className="text-gray-500">Pide al administrador del ELEAM que cree el vínculo.</p>
      </div>
    );
  }

  const activeRes = residentes.find((r) => r.id === activeId) ?? residentes[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mis visitas</h1>
          <p className="text-sm text-gray-500">
            Registro de tus visitas a {activeRes?.nombre} {activeRes?.apellido}
          </p>
        </div>
        <button
          onClick={() => navigate("/familiar")}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Volver al portal
        </button>
      </header>

      {residentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {residentes.map((r) => (
            <button
              key={r.id}
              onClick={() => { setActiveId(r.id); loadVisits(r.id); }}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                r.id === activeId
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {r.nombre} {r.apellido}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <h2 className="font-bold text-gray-800 mb-1">Registrar nueva visita</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Fecha y hora
            </label>
            <Input
              type="datetime-local"
              value={form.fecha_hora}
              onChange={(e) => setForm((f) => ({ ...f, fecha_hora: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Duración (minutos)
            </label>
            <Input
              type="number"
              min="1" max="1440"
              placeholder="Ej. 45"
              value={form.duracion_min}
              onChange={(e) => setForm((f) => ({ ...f, duracion_min: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
            Notas (opcional)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
            rows={3}
            placeholder="¿Cómo encontraste a tu familiar? ¿Algo que el equipo deba saber?"
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>
        <div className="text-right">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)] disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar visita"}
          </Button>
        </div>
      </form>

      <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">Historial</h2>
        {visitas.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes visitas registradas.</p>
        ) : (
          <ul className="divide-y">
            {visitas.map((v) => (
              <li key={v.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatDateTime(v.fecha_hora)}
                    {v.duracion_min ? <span className="text-gray-500 font-normal"> · {v.duracion_min} min</span> : null}
                  </p>
                  {v.notas && <p className="text-sm text-gray-500 mt-0.5">{v.notas}</p>}
                </div>
                {v.profiles?.nombre && (
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {v.profiles.nombre}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
