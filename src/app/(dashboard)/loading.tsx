export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded-md bg-neutral-800" />
        <div className="h-9 w-64 animate-pulse rounded-lg bg-neutral-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
    </div>
  );
}
