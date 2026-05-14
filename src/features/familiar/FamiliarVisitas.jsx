import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../utils/errorMessages";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { getVisits, logVisit } from "./familiarService";
import { useFamiliarResidentData } from "./useFamiliarResidentData";
import { formatDateTime } from "../../utils/dateUtils";

function localNowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function FamiliarVisitas() {
  const navigate = useNavigate();
  const toast = useToast();
  const [visitas, setVisitas]       = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [saving, setSaving]         = useState(false);
  const {
    residentes,
    activeId,
    activeResident,
    loading,
    selectResident,
  } = useFamiliarResidentData({ toast });

  const [form, setForm] = useState({
    fecha_hora: localNowForInput(),
    duracion_min: "",
    notas: "",
  });

  const loadVisits = useCallback(async (id) => {
    if (!id) return;
    setLoadingVisits(true);
    try {
      const v = await getVisits(id, 100);
      setVisitas(v);
    } catch (e) {
      toast(friendlyError(e, "No se pudieron cargar las visitas. Intenta de nuevo."), "error");
    } finally {
      setLoadingVisits(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeId) loadVisits(activeId);
  }, [activeId, loadVisits]);

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
      toast(friendlyError(err, "No se pudo guardar la visita. Intenta de nuevo."), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando visitas..." />;
  if (residentes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Sin residentes asignados</h1>
        <p className="text-slate-500">Pide al administrador del ELEAM que cree el vínculo.</p>
      </div>
    );
  }

  return (
    <PageLayout
      title="Mis visitas"
      eyebrow="Portal familiar"
      description={`Registro de tus visitas a ${activeResident?.nombre ?? "tu familiar"} ${activeResident?.apellido ?? ""}`}
      size="lg"
      actions={
        <Button
          onClick={() => navigate("/familiar")}
          className="bg-white text-teal-700 border border-teal-200 hover:bg-teal-50"
        >
          Volver al portal
        </Button>
      }
      className="space-y-5"
    >

      {residentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {residentes.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => selectResident(r.id)}
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

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <h2 className="font-bold text-slate-800 mb-1">Registrar nueva visita</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
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
            <label className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
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
          <label htmlFor="visita-notas" className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
            Notas (opcional)
          </label>
          <textarea
            id="visita-notas"
            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 px-3 py-2 text-sm"
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
            className="bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar visita"}
          </Button>
        </div>
      </form>

      <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-3">Historial</h2>
        {loadingVisits ? (
          <p className="text-sm text-slate-500">Cargando historial...</p>
        ) : visitas.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no tienes visitas registradas.</p>
        ) : (
          <ul className="divide-y">
            {visitas.map((v) => (
              <li key={v.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDateTime(v.fecha_hora)}
                    {v.duracion_min ? <span className="text-slate-500 font-normal"> · {v.duracion_min} min</span> : null}
                  </p>
                  {v.notas && <p className="text-sm text-slate-500 mt-0.5">{v.notas}</p>}
                </div>
                {v.profiles?.nombre && (
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {v.profiles.nombre}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageLayout>
  );
}
