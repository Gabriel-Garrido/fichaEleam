function Loading({ message = "Cargando...", fullScreen = false, className = "" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? "min-h-screen bg-slate-50 px-4" : "min-h-[200px] py-12"} ${className}`}
    >
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-2 border-t-teal-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export function LoadingOverlay({ message = "Actualizando información..." }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/20 px-4 backdrop-blur-[1px]" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-700">{message}</span>
      </div>
    </div>
  );
}

export function PageLoading({ message = "Cargando información...", cards = 4, rows = 3 }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{message}</span>
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-56 max-w-full rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-100" />
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="m-4 h-3 w-20 rounded bg-slate-100" />
              <div className="mx-4 mt-3 h-7 w-12 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 rounded-xl bg-slate-100" />)}
        </div>
      </div>
    </div>
  );
}

export function ContentLoading({ message = "Cargando información...", cards = 4, rows = 3 }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-pulse space-y-5">
      <span className="sr-only">{message}</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="m-4 h-3 w-20 rounded bg-slate-100" />
            <div className="mx-4 mt-3 h-7 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        {Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 rounded-xl bg-slate-100" />)}
      </div>
    </div>
  );
}

export default Loading;
