import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ITEMS = [
  ["/personal/equipo", "Equipo"],
  ["/personal/antecedentes", "Antecedentes SEREMI"],
  ["/personal/dotacion", "Dotación"],
  ["/operacion/turnos", "Entrega de turno"],
];

export default function PersonnelNav() {
  const { isAdminEleam, isSuperadmin } = useAuth();
  const items = isAdminEleam || isSuperadmin ? ITEMS : ITEMS.filter(([path]) => path !== "/personal/equipo");
  return (
    <nav aria-label="Personal y turnos" className="mb-5 overflow-x-auto print:hidden">
      <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {items.map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
