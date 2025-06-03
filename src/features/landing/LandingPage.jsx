import React from "react";

function LandingPage() {
  return (
    <div className="bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Hero Principal */}
      <section className="min-h-screen flex items-center justify-center px-4 sm:px-8 py-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-cover z-0" />
        <div className="max-w-5xl w-full text-center z-10">
          <h1 className="text-4xl sm:text-6xl font-black mb-6 leading-tight">
            Digitaliza tu ELEAM con FichaEleam
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Plataforma web para gestionar fichas clínicas y documentación
            exigida por SEREMI. Cumple normativas, centraliza información y
            mejora la atención a personas mayores.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/login"
              className="bg-white text-[var(--color-primary)] font-semibold py-3 px-8 rounded-full shadow-md hover:bg-[var(--color-button-hover)] hover:text-white transition"
            >
              Iniciar sesión
            </a>
            <a
              href="/register"
              className="border-2 border-white text-white font-semibold py-3 px-8 rounded-full hover:bg-white hover:text-[var(--color-primary)] transition"
            >
              Crear cuenta
            </a>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20 px-6 sm:px-12 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12">
          ¿Por qué usar FichaEleam?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              title: "Cumple con SEREMI",
              text: "Guarda toda la documentación exigida por fiscalización en un solo lugar, accesible y ordenado.",
            },
            {
              title: "Registro clínico seguro",
              text: "Ficha médica digital protegida por roles de acceso, para mantener privacidad y trazabilidad.",
            },
            {
              title: "Fácil de usar",
              text: "Diseñada para personal de ELEAM sin conocimientos técnicos, con interfaz clara y simple.",
            },
            {
              title: "Ahorro de tiempo",
              text: "Centraliza la información y evita papeles, carpetas y pérdidas de documentos importantes.",
            },
            {
              title: "Escalable",
              text: "Desde 1 hasta más de 50 residentes. Ideal para hogares pequeños y grandes.",
            },
            {
              title: "Freemium",
              text: "Úsala gratis hasta 3 residentes y luego paga según el tamaño de tu ELEAM.",
            },
          ].map(({ title, text }, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-bold mb-3 text-[var(--color-accent)]">
                {title}
              </h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Precios */}
      <section
        id="planes"
        className="py-20 px-6 sm:px-12 bg-[var(--color-secondary)] text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-[var(--color-accent)]">
          Planes y Precios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
          {[
            { residentes: "Hasta 3", precio: "Gratis" },
            { residentes: "4 a 14", precio: "$50.000 CLP/mes" },
            { residentes: "15 a 24", precio: "$80.000 CLP/mes" },
            { residentes: "25 a 34", precio: "$120.000 CLP/mes" },
          ].map(({ residentes, precio }, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-bold mb-2 text-[var(--color-accent)]">
                {residentes} residentes
              </h3>
              <p className="text-2xl font-extrabold">{precio}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-[var(--color-accent)]">
          + $5.000 por cada residente adicional sobre 34
        </p>
      </section>

      {/* Testimonios */}
      <section className="py-20 px-6 sm:px-12 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12">Testimonios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 max-w-4xl mx-auto">
          {[
            {
              nombre: "María R., Directora de ELEAM",
              texto:
                "Desde que usamos FichaEleam, los registros están organizados y las fiscalizaciones son mucho más fáciles. Nos ahorra tiempo todos los días.",
            },
            {
              nombre: "Luis G., Enfermero",
              texto:
                "La interfaz es intuitiva, incluso para quienes no manejan bien la tecnología. Es una herramienta imprescindible.",
            },
          ].map(({ nombre, texto }, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl shadow-md text-left"
            >
              <p className="italic mb-4">"{texto}"</p>
              <p className="font-semibold text-[var(--color-accent)]">
                {nombre}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-accent)] text-white py-12 px-6 sm:px-12 text-center">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-bold mb-2">FichaEleam</h4>
            <p>
              Digitalización de registros clínicos y administrativos para ELEAM
              en Chile.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-2">Enlaces</h4>
            <ul className="space-y-1">
              <li>
                <a href="/login" className="hover:underline">
                  Iniciar sesión
                </a>
              </li>
              <li>
                <a href="/register" className="hover:underline">
                  Crear cuenta
                </a>
              </li>
              <li>
                <a href="#planes" className="hover:underline">
                  Planes
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-2">Contacto</h4>
            <p>Email: contacto@fichaeleam.cl</p>
            <p>Santiago, Chile</p>
          </div>
        </div>
        <p className="mt-8 text-xs text-white/70">
          &copy; {new Date().getFullYear()} FichaEleam. Todos los derechos
          reservados.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
