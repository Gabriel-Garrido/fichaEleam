import React from "react";
import "../colors.css";

function Jumbotron() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start mt-4 ms:mt-10 bg-white px-4">
      <div className="p-6 sm:p-12 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl shadow-2xl transform transition duration-500 hover:scale-105 max-w-full sm:max-w-4xl text-center mt-0 sm:mt-1">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6">
          FichaEleam
        </h1>
        <p className="text-base sm:text-lg text-white mb-6 sm:mb-8">
          Un sistema SaaS diseñado para gestionar fichas clínicas en ELEAMs de
          Chile, ofreciendo un entorno seguro, cálido y profesional para el
          bienestar de nuestros mayores.
        </p>
        <button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-[var(--color-primary)] font-semibold rounded-full shadow-lg hover:bg-[var(--color-button-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)] focus:ring-opacity-75">
          Descubre más
        </button>
      </div>
    </div>
  );
}

export default Jumbotron;
