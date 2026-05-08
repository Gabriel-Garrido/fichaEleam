import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../features/auth/authService";
import { useAuth } from "../context/AuthContext";
import "../colors.css";

// Menú dinámico por rol. Cada rol ve solo lo que le corresponde
// para evitar links a vistas que lo terminarían redirigiendo.
function buildMenu({ rol, eleamId, pagoActivo, handleLogout }) {
  const close = {
    label: "Cerrar sesión",
    icon: "↪",
    description: "Salir de esta cuenta",
    action: handleLogout,
  };

  // Familiar: solo su portal y sus visitas.
  if (rol === "familiar") {
    return [
      { label: "Mi residente", icon: "👤", description: "Resumen clínico visible para la familia", path: "/familiar" },
      { label: "Visitas",      icon: "🗓", description: "Registrar visitas familiares", path: "/familiar/visitas" },
      close,
    ];
  }

  // Superadmin sin ELEAM: solo su panel.
  if (rol === "superadmin" && !eleamId) {
    return [
      { label: "Superadmin", icon: "⚙", description: "CRM, leads, pagos y métricas SaaS", path: "/superadmin" },
      close,
    ];
  }

  // Admin sin pago activo: solo activación.
  if (rol === "admin_eleam" && !pagoActivo) {
    return [
      { label: "Activar ELEAM", icon: "💳", description: "Elegir plan y habilitar el acceso", path: "/pago?sinAcceso=1" },
      close,
    ];
  }

  // Funcionario sin pago activo: la suscripción del admin venció;
  // limitamos el menú para no llevarlo a vistas vacías.
  if (rol === "funcionario" && !pagoActivo) {
    return [
      {
        label: "Suscripción inactiva",
        icon: "!",
        description: "Contacta al administrador del ELEAM",
        disabled: true,
      },
      close,
    ];
  }

  // Staff o superadmin-con-ELEAM (caso demo) → menú operativo completo.
  const items = [
    { label: "Dashboard",      icon: "▦", description: "Prioridades del turno y alertas", path: "/dashboard" },
    { label: "Residentes",     icon: "👥", description: "Fichas clínicas y contactos", path: "/residents" },
    { label: "Signos vitales", icon: "♥", description: "Controles por residente y alertas", path: "/vital-signs" },
    { label: "Observaciones",  icon: "✎", description: "Novedades, incidentes y seguimientos", path: "/observations" },
    { label: "Acreditación",   icon: "✓", description: "Carpeta SEREMI y documentos", path: "/accreditation" },
  ];
  if (rol === "admin_eleam") {
    items.push({ label: "Equipo",      icon: "👤", description: "Funcionarios, familiares y permisos", path: "/equipo" });
    items.push({ label: "Suscripción", icon: "💳", description: "Plan, pagos y estado de acceso", path: "/pago" });
  }
  if (rol === "superadmin") {
    items.push({ label: "Superadmin", icon: "⚙", description: "Administración de la plataforma", path: "/superadmin" });
  }
  items.push(close);
  return items;
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user, profile, eleam, pagoActivo, profileLoading,
    rol, homePath,
  } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const isActive = (path) => {
    if (!path) return false;
    const base = path.split("?")[0];
    return base === "/" ? location.pathname === "/" : location.pathname.startsWith(base);
  };
  const navHome = user ? homePath : "/";

  const menuItems = user
    ? buildMenu({ rol, eleamId: profile?.eleam_id ?? null, pagoActivo, handleLogout })
    : [
        { label: "Inicio",        path: "/" },
        { label: "Iniciar sesión", path: "/login" },
      ];

  // Pequeña etiqueta para indicar el rol del usuario en el navbar.
  const roleBadge = !rol ? null :
    rol === "admin_eleam"  ? "Admin" :
    rol === "funcionario"  ? "Funcionario" :
    rol === "familiar"     ? "Familiar" :
    rol === "superadmin"   ? "Superadmin" : null;

  return (
    <nav className="bg-[var(--color-primary)] text-white shadow-md w-full sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-14">
        <div
          className="text-lg font-bold cursor-pointer tracking-tight shrink-0"
          onClick={() => navigate(navHome)}
        >
          FichaEleam
        </div>

        {/* Desktop: user info + nav */}
        <div className="hidden lg:flex items-center gap-1">
          {user && profile && (
            <div className="mr-3 text-right max-w-[200px]">
              <div className="text-xs font-medium text-white/90 leading-tight truncate flex items-center gap-1.5 justify-end">
                <span className="truncate">{profile.nombre ?? ""}</span>
                {roleBadge && (
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                    {roleBadge}
                  </span>
                )}
              </div>
              {eleam?.nombre && (
                <div className="text-xs text-white/60 leading-tight truncate">
                  {eleam.nombre}
                </div>
              )}
              {user && !profileLoading && !pagoActivo && rol !== "superadmin" && rol !== "familiar" && (
                <div className="text-[10px] text-amber-100 leading-tight">
                  Activación pendiente
                </div>
              )}
            </div>
          )}
          <ul className="flex items-center gap-1">
            {menuItems.map((item, i) => (
              <li key={i}>
                {item.disabled ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-white/10 text-white/70"
                    title={item.description}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </span>
                ) : item.action ? (
                  <button
                    onClick={item.action}
                    title={item.description}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-white/20 transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(item.path)}
                    title={item.description}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isActive(item.path) ? "bg-white/20 font-medium" : "hover:bg-white/20"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-[var(--color-accent)] border-t border-white/20">
          {user && profile && (
            <div className="px-6 py-3 border-b border-white/10">
              <div className="text-sm font-medium text-white/90 truncate flex items-center gap-2">
                <span className="truncate">{profile.nombre ?? ""}</span>
                {roleBadge && (
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                    {roleBadge}
                  </span>
                )}
              </div>
              {eleam?.nombre && (
                <div className="text-xs text-white/60 truncate">{eleam.nombre}</div>
              )}
              {!profileLoading && !pagoActivo && rol !== "superadmin" && rol !== "familiar" && (
                <div className="text-[11px] text-amber-100 mt-0.5">
                  Activación pendiente
                </div>
              )}
            </div>
          )}
          <ul className="flex flex-col py-2">
            {menuItems.map((item, i) => (
              <li key={i}>
                {item.disabled ? (
                  <div className="w-full px-6 py-3 text-sm text-white/70 bg-white/5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center" aria-hidden>{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        {item.description && <div className="text-xs text-white/50">{item.description}</div>}
                      </div>
                    </div>
                  </div>
                ) : item.action ? (
                  <button
                    onClick={() => { item.action(); setMenuOpen(false); }}
                    className="w-full text-left px-6 py-3 text-sm hover:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-center" aria-hidden>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => { navigate(item.path); setMenuOpen(false); }}
                    className={`w-full text-left px-6 py-3 text-sm transition-colors ${
                      isActive(item.path) ? "bg-white/20 font-medium" : "hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-center" aria-hidden>{item.icon}</span>
                      <span className="min-w-0">
                        <span className="block">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs font-normal text-white/55">{item.description}</span>
                        )}
                      </span>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
