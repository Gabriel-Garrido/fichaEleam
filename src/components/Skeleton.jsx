function Pulse({ className }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function LeadSkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200 animate-pulse mt-1 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1.5">
              <Pulse className="h-3.5 w-44" />
              <Pulse className="h-3 w-56" />
            </div>
            <Pulse className="h-5 w-24 rounded-full" />
          </div>
          <Pulse className="h-2.5 w-28" />
        </div>
        <Pulse className="h-4 w-4 shrink-0" />
      </div>
    </div>
  );
}

export function LeadsSkeletonList({ count = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <LeadSkeletonCard key={i} />
      ))}
    </div>
  );
}

export function EleamTableSkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Pulse className="h-3.5 w-32" /></td>
      <td className="px-4 py-3"><Pulse className="h-5 w-20 rounded-full" /></td>
      <td className="px-4 py-3"><Pulse className="h-3.5 w-16" /></td>
      <td className="px-4 py-3"><Pulse className="h-3.5 w-24" /></td>
      <td className="px-4 py-3"><Pulse className="h-3.5 w-20" /></td>
    </tr>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 animate-pulse space-y-3">
      <Pulse className="h-3 w-24" />
      <Pulse className="h-8 w-16" />
      <Pulse className="h-2.5 w-32" />
    </div>
  );
}

export function MetricsSkeletonGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}
