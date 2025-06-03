import React from "react";
import "../colors.css";

function Navbar() {
  return (
    <nav className="bg-[var(--color-primary)] text-white p-4 shadow-md w-full">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <div className="text-lg sm:text-xl font-bold">FichaEleam</div>
        <ul className="flex flex-wrap space-x-2 sm:space-x-4">
          <li>
            <a href="#" className="hover:underline text-sm sm:text-base">
              Inicio
            </a>
          </li>
          <li>
            <a href="#" className="hover:underline text-sm sm:text-base">
              Servicios
            </a>
          </li>
          <li>
            <a href="#" className="hover:underline text-sm sm:text-base">
              Contacto
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
