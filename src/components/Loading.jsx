import React from "react";

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-[var(--color-primary)]"></div>
      <p className="absolute text-[var(--color-primary)] font-bold text-xl mt-40">
        Cargando...
      </p>
    </div>
  );
}

export default Loading;
