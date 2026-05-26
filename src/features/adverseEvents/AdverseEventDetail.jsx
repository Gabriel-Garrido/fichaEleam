import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import { isValidUUID } from "../../utils/validators";
import { formatDateTime, formatDate } from "../../utils/dateUtils";
import { userFacingFormError } from "../../utils/formValidation";
import {
  ACCION_TIPO_DOT,
  ACCION_TIPO_LABEL,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  MEDIO_NOTIFICACION_LABEL,
  SEVERIDAD_LABEL,
  formatEventDateTime,
  isOpenEvent,
  severityTone,
} from "./eventosAdversosUtils";
import {
  cancelAdverseEvent,
  getAdverseEvent,
  listEventActions,
  listEventAudit,
  reopenAdverseEvent,
} from "./eventosAdversosService";
import AdverseEventActionForm from "./AdverseEventActionForm";
import AdverseEventCloseModal from "./AdverseEventCloseModal";

export default function AdverseEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { eleam, can, isAdminEleam } = useAuth();

  const [event, setEvent] = useState(null);
  const [acciones, setAcciones] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionOpen, setActionOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const canEdit = isAdminEleam || can("editar_eventos_adversos");
  const canClose = isAdminEleam || can("cerrar_eventos_adversos");

  const load = useCallback(async () => {
    if (!isValidUUID(id)) {
      toast("ID inválido.", "error");
      navigate("/eventos-adversos");
      return;
    }
    setLoading(true);
    try {
      const [e, a, au] = await Promise.all([
        getAdverseEvent(id),
        listEventActions(id),
        listEventAudit(id).catch(() => []),
      ]);
      setEvent(e);
      setAcciones(a);
      setAudit(au);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo cargar el evento."), "error");
      navigate("/eventos-adversos");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  const handleReopen = async () => {
    const ok = await confirm({
      title: "¿Reabrir evento cerrado?",
      message: "El evento volverá al estado \"en seguimiento\" y reaparecerá en la lista de pendientes.",
      confirmText: "Reabrir",
    });
    if (!ok) return;
    setBusyAction(true);
    try {
      await reopenAdverseEvent(id, "Reapertura por el equipo.", { eleamId: eleam?.id });
      toast("Evento reabierto.", "success");
      await load();
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo reabrir el evento."), "error");
    } finally {
      setBusyAction(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "¿Cancelar este evento?",
      message: "Usa cancelar cuando el evento fue registrado por error o no corresponde. Quedará archivado pero no se borra.",
      confirmText: "Cancelar evento",
      danger: true,
    });
    if (!ok) return;
    setBusyAction(true);
    try {
      await cancelAdverseEvent(id, "Cancelado por el equipo.", { eleamId: eleam?.id });
      toast("Evento cancelado.", "success");
      await load();
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo cancelar el evento."), "error");
    } finally {
      setBusyAction(false);
    }
  };

  if (loading || !event) return <Loading message="Cargando evento adverso..." />;

  const tone = severityTone(event.severidad);
  const open = isOpenEvent(event);

  return (
    <PageLayout
      coachFeatureId="adverse-events-detail"
      eyebrow="Evento adverso"
      title={CATEGORIA_LABEL[event.categoria] ?? event.categoria}
      description={event.residente
        ? `${event.residente.apellido}, ${event.residente.nombre} · ${formatEventDateTime(event.fecha_evento, event.hora_evento)}`
        : `Sin residente vinculado · ${formatEventDateTime(event.fecha_evento, event.hora_evento)}`}
      onBack={() => navigate("/eventos-adversos")}
      actions={
        <div className="flex flex-wrap gap-2">
          {open && canEdit && (
            <Button onClick={() => navigate(`/eventos-adversos/${id}/edit`)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Editar
            </Button>
          )}
          {open && canEdit && (
            <Button onClick={() => setActionOpen(true)} className="bg-teal-700 text-white hover:bg-teal-800">
              + Agregar acción
            </Button>
          )}
          {open && canClose && (
            <Button onClick={() => setCloseOpen(true)} className="bg-emerald-700 text-white hover:bg-emerald-800">
              Cerrar evento
            </Button>
          )}
          {open && canEdit && (
            <Button onClick={handleCancel} disabled={busyAction} className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50">
              Cancelar
            </Button>
          )}
          {!open && event.estado === "cerrado" && canClose && (
            <Button onClick={handleReopen} disabled={busyAction} className="border border-amber-300 bg-white text-amber-800 hover:bg-amber-50">
              Reabrir
            </Button>
          )}
        </div>
      }
    >
      {/* Badges fijos */}
      <div className="mb-5 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          Severidad: {SEVERIDAD_LABEL[event.severidad] ?? event.severidad}
        </span>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_TONE[event.estado] ?? ESTADO_TONE.registrado}`}>
          {ESTADO_LABEL[event.estado] ?? event.estado}
        </span>
        {event.turno && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
            Turno: {event.turno}
          </span>
        )}
        {event.lugar && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {event.lugar}
          </span>
        )}
        {event.fecha_compromiso_cierre && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-100">
            Compromiso: {formatDate(event.fecha_compromiso_cierre)}
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal: datos clínicos + acciones */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Hecho clínico</h2>
            </header>
            <div className="px-5 py-4 space-y-3 text-sm text-slate-700">
              <Field label="Descripción">{event.descripcion}</Field>
              {event.causas_probables && <Field label="Causas probables">{event.causas_probables}</Field>}
              {event.acciones_inmediatas && <Field label="Acciones inmediatas">{event.acciones_inmediatas}</Field>}
              {event.testigos && <Field label="Testigos">{event.testigos}</Field>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Timeline de acciones</h2>
                <p className="text-xs text-slate-500">Notas, contactos y seguimientos en orden cronológico inverso.</p>
              </div>
              {open && canEdit && (
                <Button onClick={() => setActionOpen(true)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs">
                  + Acción
                </Button>
              )}
            </header>
            <div className="px-5 py-4">
              {acciones.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Aún no hay acciones registradas. Agrega notas, contactos y reevaluaciones para construir la trazabilidad.
                </p>
              ) : (
                <ol className="space-y-4 relative ml-1.5 border-l border-slate-200 pl-5">
                  {acciones.map((a) => (
                    <li key={a.id} className="relative">
                      <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${ACCION_TIPO_DOT[a.tipo] ?? "bg-slate-400"}`} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {ACCION_TIPO_LABEL[a.tipo] ?? a.tipo}
                        <span className="ml-2 text-[10px] font-normal text-slate-400">{formatDateTime(a.creado_en)}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{a.descripcion}</p>
                      {a.realizado?.nombre && (
                        <p className="mt-1 text-[11px] text-slate-400">— {a.realizado.nombre}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {event.conclusiones && (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-sm">
              <header className="border-b border-emerald-100 px-5 py-3">
                <h2 className="text-sm font-bold text-emerald-900">Conclusiones del cierre</h2>
              </header>
              <div className="px-5 py-4 text-sm text-emerald-900 whitespace-pre-wrap">
                {event.conclusiones}
              </div>
            </section>
          )}
        </div>

        {/* Columna lateral: contexto */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-bold text-slate-900">Familia</h2>
            </header>
            <div className="px-5 py-4 space-y-2 text-sm">
              {event.notificado_familia ? (
                <>
                  <p className="text-emerald-700 font-semibold">Familia informada</p>
                  <p className="text-xs text-slate-600">
                    Medio: <strong>{MEDIO_NOTIFICACION_LABEL[event.medio_notificacion_familia] ?? "—"}</strong>
                  </p>
                  {event.fecha_notificacion_familia && (
                    <p className="text-xs text-slate-600">
                      {formatDateTime(event.fecha_notificacion_familia)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Aún sin registro de contacto con la familia.</p>
              )}
              <hr className="border-slate-100" />
              {event.visible_familiar ? (
                <>
                  <p className="text-teal-700 font-semibold">Visible en portal familiar</p>
                  <p className="text-xs text-slate-600 italic">{event.resumen_familiar || "Sin resumen."}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">No visible para el familiar.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-bold text-slate-900">Auditoría</h2>
            </header>
            <div className="px-5 py-4">
              {audit.length === 0 ? (
                <p className="text-xs text-slate-500">Sin movimientos.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-600">
                  {audit.slice(0, 10).map((row) => (
                    <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-700 uppercase tracking-wide">{row.accion}</span>
                      <span className="text-slate-400">{formatDateTime(row.realizado_en)}</span>
                      {row.realizado?.nombre && <span className="w-full text-slate-400">{row.realizado.nombre}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>

      <AdverseEventActionForm
        isOpen={actionOpen}
        eventId={id}
        eleamId={eleam?.id}
        onClose={() => setActionOpen(false)}
        onCreated={() => { setActionOpen(false); load(); }}
      />

      <AdverseEventCloseModal
        isOpen={closeOpen}
        eventId={id}
        eleamId={eleam?.id}
        onClose={() => setCloseOpen(false)}
        onClosed={() => { setCloseOpen(false); load(); }}
      />
    </PageLayout>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
