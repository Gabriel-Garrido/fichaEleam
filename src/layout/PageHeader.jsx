export default function PageHeader({
  title,
  eyebrow,
  description,
  actions = null,
  compact = false,
}) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${compact ? "" : "mb-6"}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

