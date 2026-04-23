import React from "react";

function Loading({ message = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[var(--color-primary)] mb-4" />
      <p className="text-[var(--color-primary)] font-medium text-base">{message}</p>
    </div>
  );
}

export default Loading;
