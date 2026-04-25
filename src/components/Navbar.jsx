import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../features/auth/authService";
import { useAuth } from "../context/AuthContext";
import "../colors.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, eleam } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const menuItems = user
    ? [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Residentes", path: "/residents" },
        { label: "Signos Vitales", path: "/vital-signs" },
        { label: "Observaciones", path: "/observations" },
        { label: "Acreditación", path: "/accreditation" },
        ...(profile?.rol === "superadmin"
          ? [{ label: "Superadmin", path: "/superadmin" }]
          : []),
        { label: "Cerrar sesión", action: handleLogout },
      ]
    : [
        { label: "Inicio", path: "/" },
        { label: "Iniciar sesión", path: "/login" },
      ];

  return (
    <nav className="bg-[var(--color-primary)] text-white shadow-md w-full sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-14">
        <div
          className="text-lg font-bold cursor-pointer tracking-tight shrink-0"
          onClick={() => navigate(user ? "/dashboard" : "/")}
        >
          FichaEleam
        </div>

        {/* Desktop: user info + nav */}
        <div className="hidden sm:flex items-center gap-1">
          {user && profile && (
            <div className="mr-3 text-right max-w-[160px]">
              <div className="text-xs font-medium text-white/90 leading-tight truncate">
                {profile.nombre ?? ""}
              </div>
              {eleam?.nombre && (
                <div className="text-xs text-white/60 leading-tight truncate">
                  {eleam.nombre}
                </div>
              )}
            </div>
          )}
          <ul className="flex items-center gap-1">
            {menuItems.map((item, i) => (
              <li key={i}>
                {item.action ? (
                  <button
                    onClick={item.action}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-white/20 transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(item.path)}
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
          className="sm:hidden text-white focus:outline-none"
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
        <div className="sm:hidden bg-[var(--color-accent)] border-t border-white/20">
          {user && profile && (
            <div className="px-6 py-3 border-b border-white/10">
              <div className="text-sm font-medium text-white/90 truncate">
                {profile.nombre ?? ""}
              </div>
              {eleam?.nombre && (
                <div className="text-xs text-white/60 truncate">{eleam.nombre}</div>
              )}
            </div>
          )}
          <ul className="flex flex-col py-2">
            {menuItems.map((item, i) => (
              <li key={i}>
                {item.action ? (
                  <button
                    onClick={() => { item.action(); setMenuOpen(false); }}
                    className="w-full text-left px-6 py-3 text-sm hover:bg-white/10 transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <button
                    onClick={() => { navigate(item.path); setMenuOpen(false); }}
                    className={`w-full text-left px-6 py-3 text-sm transition-colors ${
                      isActive(item.path) ? "bg-white/20 font-medium" : "hover:bg-white/10"
                    }`}
                  >
                    {item.label}
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
