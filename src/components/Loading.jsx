import React from "react";

function Loading({ message = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-12 gap-3">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-2 border-t-teal-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export default Loading;
