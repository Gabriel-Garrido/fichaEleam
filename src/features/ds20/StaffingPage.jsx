import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import PageLayout from "../../layout/PageLayout";
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
  syncStaffMembersFromProfiles,
} from "./staffingService";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const SHIFT_ROLE_OPTIONS = [
  ["cuidador", "Cuidador/a"],
  ["tens", "TENS / auxiliar"],
  ["responsable", "Responsable"],
  ["apoyo", "Apoyo"],
  ["otro", "Otro"],
];

function shiftLabel(turno) {
  if (turno === "mañana") return "Mañana";
  if (turno === "tarde") return "Tarde";
  return "Noche";
}

function shiftRoleLabel(role) {
  return SHIFT_ROLE_OPTIONS.find(([value]) => value === role)?.[1] ?? role ?? "Sin rol";
}

function dayLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function complianceTone(row) {
  if (row?.incumple) return "border-rose-200 bg-rose-50";
  return "border-emerald-100 bg-emerald-50";
}

function Metric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
  };
  return (
    <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function StaffingPage() {
  const toast = useToast();
  const { isAdminEleam } = useAuth();
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(todayIso()));
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState({});
  const [selectedRole, setSelectedRole] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)), [weekStart]);
  const weekEnd = weekDays[6];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const staffRows = isAdminEleam ? await syncStaffMembersFromProfiles() : await listStaffMembers();
      const [assignmentRows, complianceRows] = await Promise.all([
        listShiftAssignments({ from: weekStart, to: weekEnd }),
        getStaffingCompliance({ from: weekStart, to: weekEnd }),
      ]);
      setStaff(staffRows);
      setAssignments(assignmentRows);
      setCompliance(complianceRows);
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo cargar dotación.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdminEleam, toast, weekEnd, weekStart]);

  useEffect(() => { load(); }, [load]);

  const activeStaff = staff.filter((item) => item.activo !== false);
  const assignmentBySlot = useMemo(() => {
    const map = new Map();
    for (const item of assignments) {
      const key = `${item.fecha}|${item.turno}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [assignments]);

  const complianceBySlot = useMemo(() => {
    const map = new Map();
    for (const item of compliance) map.set(`${item.fecha}|${item.turno}`, item);
    return map;
  }, [compliance]);

  const summary = useMemo(() => {
    const bad = compliance.filter((item) => item.incumple);
    return {
      incumplimientos: bad.length,
      deficit: bad.reduce((sum, item) => sum + Math.max(0, Math.abs(Math.min(0, item.brecha_cuidadores ?? 0))), 0),
      sinClasificar: Math.max(0, ...compliance.map((item) => item.residentes_sin_clasificar ?? 0), 0),
    };
  }, [compliance]);

  const addAssignment = async (fecha, turno) => {
    const key = `${fecha}|${turno}`;
    const staffId = selectedStaff[key];
    if (!staffId) {
      toast("Selecciona una persona para asignar.", "warning");
      return;
    }
    setSaving(true);
    try {
      await saveShiftAssignment({
        staff_member_id: staffId,
        fecha,
        turno,
        rol_turno: selectedRole[key] || "cuidador",
      });
      setSelectedStaff((prev) => ({ ...prev, [key]: "" }));
      setSelectedRole((prev) => ({ ...prev, [key]: "cuidador" }));
      await load();
      toast("Turno asignado.", "success");
    } catch (error) {
      toast(error.message || "No se pudo asignar el turno.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (id) => {
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
      toast(`Semana copiada: ${copied.length} asignación${copied.length === 1 ? "" : "es"}.`, "success");
    } catch (error) {
      toast(error.message || "No se pudo copiar la semana anterior.", "error");
    } finally {
      setSaving(false);
    }
  };

  const renderSlot = (fecha, turno) => {
    const key = `${fecha}|${turno}`;
    const rows = assignmentBySlot.get(key) ?? [];
    const comp = complianceBySlot.get(key);
    return (
      <div key={key} className={`rounded-2xl border p-3 ${complianceTone(comp)}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{shiftLabel(turno)}</p>
            <p className="text-xs text-slate-600">
              Req. {comp?.requerido_cuidadores ?? 0} · Asignados {comp?.asignados_cuidadores ?? 0}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${comp?.incumple ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            {comp?.incumple ? "Revisar" : "Cumple"}
          </span>
        </div>
        {comp?.alertas?.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-rose-700">
            {comp.alertas.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        <div className="mt-3 space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-500">Sin personas asignadas.</p>
          ) : rows.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.staff?.nombre}</p>
                <p className="text-xs text-slate-500">
                  {item.staff?.cargo || TIPO_DOTACION_LABEL[item.staff?.tipo_dotacion] || "Sin cargo"} · Rol: {shiftRoleLabel(item.rol_turno)}
                </p>
              </div>
              {isAdminEleam && (
                <button type="button" disabled={saving} onClick={() => removeAssignment(item.id)} className="shrink-0 text-xs font-semibold text-rose-600 hover:underline">
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
        {isAdminEleam && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <select aria-label={`Persona para ${shiftLabel(turno)} ${formatDateOnly(fecha)}`} className={inputClass} value={selectedStaff[key] ?? ""} disabled={saving || activeStaff.length === 0} onChange={(e) => setSelectedStaff((prev) => ({ ...prev, [key]: e.target.value }))}>
              <option value="">Asignar persona</option>
              {activeStaff.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {TIPO_DOTACION_LABEL[item.tipo_dotacion] ?? item.tipo_dotacion}</option>)}
            </select>
            <select aria-label={`Rol de turno para ${shiftLabel(turno)} ${formatDateOnly(fecha)}`} className={inputClass} value={selectedRole[key] ?? "cuidador"} disabled={saving} onChange={(e) => setSelectedRole((prev) => ({ ...prev, [key]: e.target.value }))}>
              {SHIFT_ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button type="button" disabled={saving} onClick={() => addAssignment(fecha, turno)} className="shrink-0 bg-teal-700 text-white hover:bg-teal-800">
              Agregar
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout
      title="Dotación DS20"
      eyebrow="Gestión del ELEAM"
      description="Planifica la semana, asigna personas por turno y detecta brechas de cuidadores según dependencia."
      size="xl"
      className="space-y-5"
      coachFeatureId="staffing"
      actions={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => setWeekStart(addDaysIso(weekStart, -7))} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Semana anterior</Button>
          <Button type="button" onClick={() => setWeekStart(mondayOfWeek(todayIso()))} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Hoy</Button>
          <Button type="button" onClick={() => setWeekStart(addDaysIso(weekStart, 7))} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Semana siguiente</Button>
        </div>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Semana" value={`${formatDateOnly(weekStart).slice(0, 5)} - ${formatDateOnly(weekEnd).slice(0, 5)}`} />
        <Metric label="Incumplimientos" value={summary.incumplimientos} tone={summary.incumplimientos ? "rose" : "emerald"} />
        <Metric label="Déficit cuidadores" value={summary.deficit} tone={summary.deficit ? "rose" : "emerald"} />
        <Metric label="Sin clasificar" value={summary.sinClasificar} tone={summary.sinClasificar ? "amber" : "emerald"} />
      </section>

      {isAdminEleam && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Personal disponible: {activeStaff.length}</p>
              <p className="mt-1 text-xs text-slate-500">Edita cargos y tipo de dotación desde Equipo → Competencias DS20.</p>
            </div>
            <Button type="button" disabled={saving} onClick={copyWeek} className="bg-teal-700 text-white hover:bg-teal-800">
              Copiar semana anterior
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading message="Cargando calendario de dotación..." />
      ) : (
        <div className="space-y-4">
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:block">
            <div className="grid min-w-[1120px] grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div key={day} className="space-y-3">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-sm font-bold capitalize text-slate-900">{dayLabel(day)}</p>
                  </div>
                  {TURNOS_DS20.map((turno) => renderSlot(day, turno))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 xl:hidden">
            {weekDays.map((day) => (
              <details key={day} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" open={day === todayIso()}>
                <summary className="cursor-pointer list-none px-1 py-2 text-sm font-bold capitalize text-slate-900">{dayLabel(day)}</summary>
                <div className="mt-2 space-y-3">
                  {TURNOS_DS20.map((turno) => renderSlot(day, turno))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
