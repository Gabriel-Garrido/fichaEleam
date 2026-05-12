import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import PaymentModal from "./components/PaymentModal";
import RecentPaymentsTable from "./components/RecentPaymentsTable";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { getAllEleams, getRecentPayments, registerPayment } from "./superadminService";

export default function SuperAdminPagos() {
  const [payments, setPayments] = useState([]);
  const [eleams, setEleams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, e] = await Promise.all([getRecentPayments(80), getAllEleams()]);
    setPayments(p);
    setEleams(e);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async (payload) => {
    const result = await registerPayment(payload);
    await load();
    return result;
  };

  if (loading) return <Loading message="Cargando pagos..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Pagos"
        description="Conciliación de pagos recientes y activación manual de suscripciones."
        actions={
          <button type="button" onClick={() => setShowPay(true)} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Registrar pago
          </button>
        }
      />
      <RecentPaymentsTable payments={payments} onSelectEleam={() => {}} />
      <PaymentModal isOpen={showPay} onClose={() => setShowPay(false)} eleams={eleams} defaultEleamId="" onRegister={handleRegister} />
    </div>
  );
}

