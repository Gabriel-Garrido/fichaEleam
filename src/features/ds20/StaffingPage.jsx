import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import PageLayout from "../../layout/PageLayout";
import PersonnelNav from "../personnel/PersonnelNav";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly, todayIso } from "../../utils/dateUtils";
import {
  TIPO_DOTACION_LABEL,
  TURNOS_DS20,
  addDaysIso,
  copyPreviousWeek,
  deleteShiftAssignment,
  getStaffingCompliance,
  listShiftAssignments,
  listStaffMembers,
  mondayOfWeek,
  saveShiftAssignment,
  shiftRoleForStaff,
  syncStaffMembersFromProfiles,
} from "./staffingService";

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

function shiftLabel(turno) {
  return turno === "mañana" ? "Mañana" : turno === "tarde" ? "Tarde" : "Noche";
}

function shortDay(date) {
  const value = new Date(`${date}T12:00:00`);
  return {
    weekday: value.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
    day: value.toLocaleDateString("es-CL", { day: "2-digit" }),
  };
}

export default function StaffingPage() {
  const toast = useToast();
  const { isAdminEleam } = useAuth();
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(todayIso()));
  const [selectedDay, setSelectedDay] = useState(() => todayIso());
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [selection, setSelection] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)), [weekStart]);
  const weekEnd = weekDays[6];

  useEffect(() => {
    if (!weekDays.includes(selectedDay)) setSelectedDay(weekStart);
  }, [selectedDay, weekDays, weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const people = isAdminEleam ? await syncStaffMembersFromProfiles() : await listStaffMembers();
      const [planned, checks] = await Promise.all([
        listShiftAssignments({ from: weekStart, to: weekEnd }),
        getStaffingCompliance({ from: weekStart, to: weekEnd }),
      ]);
      setStaff(people);
      setAssignments(planned);
      setCompliance(checks);
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo cargar la dotación.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdminEleam, toast, weekEnd, weekStart]);

  useEffect(() => { load(); }, [load]);

  const activeStaff = useMemo(() => staff.filter((person) => person.activo !== false), [staff]);
  const assignmentsBySlot = useMemo(() => {
    const map = new Map();
    assignments.forEach((item) => {
      const key = `${item.fecha}|${item.turno}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [assignments]);
  const complianceBySlot = useMemo(() => new Map(compliance.map((item) => [`${item.fecha}|${item.turno}`, item])), [compliance]);
  const selectedChecks = TURNOS_DS20.map((turno) => complianceBySlot.get(`${selectedDay}|${turno}`)).filter(Boolean);
  const weekIssues = compliance.filter((item) => item.incumple).length;
  const unclassified = Math.max(0, ...compliance.map((item) => item.residentes_sin_clasificar ?? 0), 0);

  const changeWeek = (days) => {
    const next = addDaysIso(weekStart, days);
    setWeekStart(next);
    setSelectedDay(next);
  };

  const addPerson = async (turno) => {
    const staffId = selection[turno];
    const person = activeStaff.find((item) => item.id === staffId);
    if (!person) return toast("Selecciona una persona.", "warning");
    setSaving(true);
    try {
      await saveShiftAssignment({
        staff_member_id: person.id,
        fecha: selectedDay,
        turno,
        rol_turno: shiftRoleForStaff(person.tipo_dotacion),
      });
      setSelection((current) => ({ ...current, [turno]: "" }));
      await load();
      toast("Persona asignada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo asignar la persona.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removePerson = async (id) => {
    setSaving(true);
    try {
      await deleteShiftAssignment(id);
      await load();
    } catch (error) {
      toast(error.message || "No se pudo quitar la asignación.", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyWeek = async () => {
    setSaving(true);
    try {
      const copied = await copyPreviousWeek({ weekStart });
      await load();
      toast(copied.length ? `Se copiaron ${copied.length} asignaciones.` : "La semana anterior no tiene asignaciones.", copied.length ? "success" : "warning");
    } catch (error) {
      toast(error.message || "No se pudo copiar la semana anterior.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Personal"
      title="Dotación semanal"
      description="Selecciona un día, asigna personas y revisa si cumple el mínimo de cuidadores."
      size="xl"
      coachFeatureId="staffing"
    >
      <PersonnelNav />

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => changeWeek(-7)} className="border border-slate-200 bg-white text-slate-700">←</Button>
            <div className="min-w-0 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semana</p>
              <p className="text-sm font-bold text-slate-950">{formatDateOnly(weekStart)} — {formatDateOnly(weekEnd)}</p>
            </div>
            <Button type="button" onClick={() => changeWeek(7)} className="border border-slate-200 bg-white text-slate-700">→</Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => { const today = todayIso(); setWeekStart(mondayOfWeek(today)); setSelectedDay(today); }} className="border border-slate-200 bg-white text-slate-700">Hoy</Button>
            {isAdminEleam && <Button type="button" disabled={saving} onClick={copyWeek} className="bg-teal-700 text-white hover:bg-teal-800">Copiar semana anterior</Button>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1" role="tablist" aria-label="Días de la semana">
          {weekDays.map((day) => {
            const label = shortDay(day);
            const issues = compliance.filter((item) => item.fecha === day && item.incumple).length;
            const active = day === selectedDay;
            return (
              <button key={day} type="button" role="tab" aria-selected={active} onClick={() => setSelectedDay(day)} className={`relative min-h-14 rounded-xl px-1 py-2 text-center ${active ? "bg-teal-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                <span className="block text-[11px] font-semibold capitalize sm:text-xs">{label.weekday}</span>
                <span className="block text-base font-bold">{label.day}</span>
                {issues > 0 && <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${active ? "bg-amber-300" : "bg-rose-500"}`}><span className="sr-only">{issues} alertas</span></span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Summary label="Estado del día" value={selectedChecks.some((item) => item.incumple) ? "Revisar" : "Cumple"} alert={selectedChecks.some((item) => item.incumple)} />
        <Summary label="Alertas de la semana" value={weekIssues} alert={weekIssues > 0} />
        <Summary label="Residentes sin clasificar" value={unclassified} alert={unclassified > 0} />
      </div>

      {loading ? <Loading message="Cargando dotación..." /> : activeStaff.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Primero agrega personas y completa su tipo de dotación desde “Equipo”.</div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {TURNOS_DS20.map((turno) => {
            const key = `${selectedDay}|${turno}`;
            const rows = assignmentsBySlot.get(key) ?? [];
            const check = complianceBySlot.get(key);
            return (
              <article key={turno} className={`rounded-2xl border p-4 shadow-sm ${check?.incumple ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-bold text-slate-950">{shiftLabel(turno)}</h2><p className="mt-1 text-xs text-slate-600">{check?.asignados_cuidadores ?? 0} de {check?.requerido_cuidadores ?? 0} cuidadores</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${check?.incumple ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{check?.incumple ? "Falta personal" : "Cumple"}</span>
                </div>
                {check?.alertas?.length > 0 && <ul className="mt-3 space-y-1 text-xs font-medium text-rose-700">{check.alertas.map((alert) => <li key={alert}>• {alert}</li>)}</ul>}
                <div className="mt-4 space-y-2">
                  {rows.length === 0 ? <p className="rounded-xl bg-white/80 p-3 text-sm text-slate-500">Sin personas asignadas.</p> : rows.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{item.staff?.nombre}</p><p className="truncate text-xs text-slate-500">{TIPO_DOTACION_LABEL[item.staff?.tipo_dotacion] ?? item.staff?.cargo ?? "Personal"}</p></div>
                      {isAdminEleam && <button type="button" disabled={saving} onClick={() => removePerson(item.id)} className="min-h-11 px-2 text-xs font-semibold text-rose-600">Quitar</button>}
                    </div>
                  ))}
                </div>
                {isAdminEleam && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    <select aria-label={`Persona para turno ${shiftLabel(turno)}`} className={inputClass} value={selection[turno] ?? ""} disabled={saving} onChange={(event) => setSelection((current) => ({ ...current, [turno]: event.target.value }))}>
                      <option value="">Seleccionar persona</option>
                      {activeStaff.map((person) => <option key={person.id} value={person.id}>{person.nombre} · {TIPO_DOTACION_LABEL[person.tipo_dotacion] ?? "Otro"}</option>)}
                    </select>
                    <Button type="button" disabled={saving || !selection[turno]} onClick={() => addPerson(turno)} className="bg-teal-700 text-white hover:bg-teal-800">Asignar</Button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-500">Cálculo referencial según DS 20, arts. 15–17. La clasificación de dependencia de los residentes debe estar actualizada y la documentación presentada a SEREMI debe coincidir con la dotación real.</p>
    </PageLayout>
  );
}

function Summary({ label, value, alert }) {
  return <div className={`rounded-2xl border p-4 ${alert ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}><p className="text-xs font-semibold text-slate-600">{label}</p><p className={`mt-1 text-xl font-bold ${alert ? "text-rose-700" : "text-emerald-700"}`}>{value}</p></div>;
}
