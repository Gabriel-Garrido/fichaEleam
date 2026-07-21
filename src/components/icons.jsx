// Iconos de acción compartidos (Heroicons outline, inline SVG).
// Para iconos de navegación usar NavIcon.jsx.

export function IconPlus({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
