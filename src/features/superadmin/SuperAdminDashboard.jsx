import React, { useState, useEffect, useCallback } from "react";
import {
  getMetrics,
  getAllEleams,
  updateEleam,
  getRecentPayments,
  registerPayment,
} from "./superadminService";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";

const PLAN_LABEL = { demo: "Demo", mensual: "Mensual", anual: "Anual", inactivo: "Inactivo" };
const PLAN_BADGE = {
  demo:     "bg-gray-100 text-gray-600",
  mensual:  "bg-blue-100 text-blue-700",
  anual:    "bg-purple-100 text-purple-700",
  inactivo: "bg-red-100 text-red-600",
};

function MetricCard({ label, value, sub, color = "text-gray-800" }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function formatCLP(n) {
  if (!n) return "$0";
  return n.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [metrics, setMetrics]     = useState(null);
  const [eleams, setEleams]       = useState([]);
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [editEleam, setEditEleam] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm]     = useState({
    eleam_id: "", monto: "", plan: "mensual", metodo_pago: "", notas: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [m, e, p] = await Promise.allSettled([
      getMetrics(),
      getAllEleams(),
      getRecentPayments(),
    ]);
    if (m.status === "fulfilled") setMetrics(m.value);
    if (e.status === "fulfilled") setEleams(e.value);
    if (p.status === "fulfilled") setPayments(p.value);
    if (m.status === "rejected" && e.status === "rejected") {
      toast("Sin acceso a datos de superadmin. Verifica las políticas RLS.", "error");
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filtered = eleams.filter((e) =>
    !search ||
    e.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    e.email_admin?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (eleam) => {
    setEditEleam(eleam);
    setEditForm({
      pago_activo:                   eleam.pago_activo ?? false,
      plan:                          eleam.plan ?? "demo",
      max_residentes:                eleam.max_residentes ?? "",
      fecha_vencimiento_suscripcion: eleam.fecha_vencimiento_suscripcion
        ? eleam.fecha_vencimiento_suscripcion.slice(0, 10)
        : "",
      notas_admin: eleam.notas_admin ?? "",
    });
  };

  const handleSaveEleam = async () => {
    setSaving(true);
    try {
      const updated = await updateEleam(editEleam.id, {
        ...editForm,
        max_residentes: editForm.max_residentes !== ""
          ? parseInt(editForm.max_residentes, 10)
          : null,
        fecha_vencimiento_suscripcion:
          editForm.fecha_vencimiento_suscripcion || null,
      });
      setEleams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast("ELEAM actualizado correctamente.", "success");
      setEditEleam(null);
    } catch {
      toast("No se pudo actualizar el ELEAM.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!payForm.eleam_id || !payForm.monto) {
      toast("ELEAM y monto son obligatorios.", "error");
      return;
    }
    setSaving(true);
    try {
      const today    = new Date().toISOString().slice(0, 10);
      const daysAhead = payForm.plan === "anual" ? 365 : 30;
      const fechaFin  = new Date(Date.now() + daysAhead * 86400000)
        .toISOString().slice(0, 10);

      await registerPayment({
        eleam_id:           payForm.eleam_id,
        monto:              parseInt(payForm.monto, 10),
        plan:               payForm.plan,
        fecha_inicio:       today,
        fecha_fin:          fechaFin,
        metodo_pago:        payForm.metodo_pago || null,
        notas:              payForm.notas || null,
      });
      await updateEleam(payForm.eleam_id, {
        pago_activo:                   true,
        plan:                          payForm.plan,
        fecha_vencimiento_suscripcion: fechaFin,
      });

      toast("Pago registrado y ELEAM activado.", "success");
      setShowPayModal(false);
      setPayForm({ eleam_id: "", monto: "", plan: "mensual", metodo_pago: "", notas: "" });
      load();
    } catch {
      toast("No se pudo registrar el pago.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando panel superadmin..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Panel Superadmin</h1>
        <p className="text-slate-300 text-sm">Gestión global de FichaEleam</p>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="ELEAMs registrados"
            value={metrics.totalEleams}
            sub={`+${metrics.newEleamsThisMonth} este mes`}
          />
          <MetricCard
            label="Suscripciones activas"
            value={metrics.activeSubscriptions}
            color="text-green-600"
            sub={`${metrics.demoEleams} en demo`}
          />
          <MetricCard
            label="Residentes totales"
            value={metrics.totalResidents}
            sub={`${metrics.activeResidents} activos`}
          />
          <MetricCard
            label="Ingresos (mes actual)"
            value={formatCLP(metrics.mrrCLP)}
            color="text-blue-600"
          />
        </div>
      )}

      {/* ELEAM table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-100 gap-3">
          <h2 className="font-semibold text-gray-700 text-lg">
            Establecimientos ({filtered.length})
          </h2>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            <input
              type="search"
              placeholder="Buscar ELEAM…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 flex-1 sm:w-52"
            />
            <button
              onClick={() => setShowPayModal(true)}
              className="bg-slate-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              + Registrar Pago
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ELEAM</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Plan</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Vencimiento</th>
                <th className="px-4 py-3 text-center">Registro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron ELEAMs.
                  </td>
                </tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.email_admin ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_BADGE[e.plan] ?? "bg-gray-100 text-gray-600"}`}>
                      {PLAN_LABEL[e.plan] ?? e.plan ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      e.pago_activo
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {e.pago_activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {e.fecha_vencimiento_suscripcion
                      ? new Date(e.fecha_vencimiento_suscripcion).toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {new Date(e.creado_en).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(e)}
                      className="text-slate-600 hover:text-slate-900 text-xs underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-lg p-5 border-b border-gray-100">
            Últimos Pagos
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">ELEAM</th>
                  <th className="px-4 py-3 text-center">Monto</th>
                  <th className="px-4 py-3 text-center">Plan</th>
                  <th className="px-4 py-3 text-center">Método</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.eleams?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-700">{formatCLP(p.monto)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_BADGE[p.plan] ?? "bg-gray-100 text-gray-600"}`}>
                        {PLAN_LABEL[p.plan] ?? p.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.metodo_pago ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {new Date(p.fecha_pago).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.estado === "completado"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit ELEAM Modal */}
      <Modal
        isOpen={!!editEleam}
        onClose={() => setEditEleam(null)}
        title={`Editar: ${editEleam?.nombre ?? ""}`}
      >
        {editEleam && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.pago_activo ?? false}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, pago_activo: e.target.checked }))
                }
                className="w-4 h-4 accent-slate-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Suscripción activa
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Plan</label>
              <select
                value={editForm.plan ?? "demo"}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, plan: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="demo">Demo</option>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Máx. residentes <span className="font-normal text-gray-400">(vacío = ilimitado)</span>
              </label>
              <input
                type="number"
                min="1"
                value={editForm.max_residentes ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, max_residentes: e.target.value }))
                }
                placeholder="Ej: 30"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Vencimiento suscripción
              </label>
              <input
                type="date"
                value={editForm.fecha_vencimiento_suscripcion ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    fecha_vencimiento_suscripcion: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Notas internas
              </label>
              <textarea
                value={editForm.notas_admin ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, notas_admin: e.target.value }))
                }
                rows={2}
                placeholder="Notas visibles solo para superadmin…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditEleam(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEleam}
                disabled={saving}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Register Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Registrar Pago"
      >
        <form onSubmit={handleRegisterPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              ELEAM *
            </label>
            <select
              value={payForm.eleam_id}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, eleam_id: e.target.value }))
              }
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar ELEAM…</option>
              {eleams.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Monto CLP *
              </label>
              <input
                type="number"
                min="1"
                value={payForm.monto}
                onChange={(e) =>
                  setPayForm((p) => ({ ...p, monto: e.target.value }))
                }
                required
                placeholder="50000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Plan *</label>
              <select
                value={payForm.plan}
                onChange={(e) =>
                  setPayForm((p) => ({ ...p, plan: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Método de pago
            </label>
            <input
              type="text"
              value={payForm.metodo_pago}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, metodo_pago: e.target.value }))
              }
              placeholder="Transferencia, tarjeta, efectivo…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={payForm.notas}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, notas: e.target.value }))
              }
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Registrando…" : "Registrar y Activar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
