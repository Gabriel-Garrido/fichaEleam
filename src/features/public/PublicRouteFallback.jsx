// Loader contenido para el cuerpo del layout público: ocupa el alto del viewport menos
// el navbar/footer, de modo que estos permanecen visibles mientras carga el chunk de la
// página (sin spinner de pantalla completa ni colapso del layout).
export default function PublicRouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-white px-5" role="status" aria-live="polite">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-700"
      />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
