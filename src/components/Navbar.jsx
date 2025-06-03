import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authService";
import "../colors.css";

function Navbar({ isLoggedIn }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Usuario deslogueado");
      navigate("/login");
    } catch (err) {
      console.error("Error al desloguear:", err);
    }
  };

  const menuItems = isLoggedIn
    ? [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Residentes", path: "/residents" },
        { label: "Documentos", path: "/documents" },
        { label: "Registros Clínicos", path: "/clinical-records" },
        { label: "Logout", action: handleLogout },
      ]
    : [
        { label: "Inicio", path: "/" },
        { label: "Login", path: "/login" },
      ];

  return (
    <nav className="bg-[var(--color-primary)] text-white p-4 shadow-md w-full">
      <div className="container mx-auto flex justify-between items-center">
        <div
          className="text-lg sm:text-xl font-bold cursor-pointer"
          onClick={() => navigate(isLoggedIn ? "/dashboard" : "/")}
        >
          FichaEleam
        </div>
        <button
          className="sm:hidden text-white focus:outline-none transition-transform duration-300 transform hover:scale-110"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
        <ul
          className={`absolute top-16 left-0 w-full bg-[var(--color-primary)] text-white flex flex-col items-center space-y-4 py-4 sm:space-y-0 sm:py-0 sm:static sm:flex-row sm:justify-end sm:space-x-8 transition-all duration-300 ease-in-out ${
            menuOpen || window.innerWidth >= 640 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden"
          }`}
          role="menu"
        >
          {menuItems.map((item, index) => (
            <li key={index} className="px-4 py-2 hover:bg-[var(--color-secondary)] rounded-md transition-colors duration-200">
              {item.action ? (
                <button
                  onClick={() => {
                    item.action();
                    setMenuOpen(false);
                  }}
                  className="text-sm sm:text-base focus:outline-none"
                  role="menuitem"
                >
                  {item.label}
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate(item.path);
                    setMenuOpen(false);
                  }}
                  className="text-sm sm:text-base focus:outline-none"
                  role="menuitem"
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
