export default function SuperAdminPageHeader({ title, description, actions = null }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">Superadmin</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
    </header>
  );
}
