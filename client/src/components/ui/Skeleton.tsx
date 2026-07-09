interface SkeletonProps {
  className?: string;
}

/** Shimmering placeholder block. Size it with className (h-*, w-*). */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Skeleton for a stat/KPI card. */
export function SkeletonStatCard() {
  return (
    <div className="card-panel p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-8 w-2/3 rounded-lg" />
      <Skeleton className="mt-2.5 h-3 w-28 rounded-full" />
    </div>
  );
}

// Slightly varied bar widths so rows read as real content, not a rigid grid.
const ROW_TITLE_W = ["w-2/5", "w-1/3", "w-5/12", "w-1/3"];
const ROW_SUB_W = ["w-3/5", "w-1/2", "w-7/12", "w-2/5"];

/** Skeleton for a list of rows (cards/table rows). */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-panel flex items-center gap-4 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className={`h-4 ${ROW_TITLE_W[i % ROW_TITLE_W.length]} rounded-full`} />
            <Skeleton className={`h-3 ${ROW_SUB_W[i % ROW_SUB_W.length]} rounded-full`} />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Full-page dashboard skeleton: header + stat grid + a chart panel + rows. */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </div>
        <Skeleton className="hidden h-10 w-32 rounded-xl sm:block" />
      </div>

      {/* stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* wide content panel (chart / table area) */}
      <div className="card-panel p-5">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>

      <SkeletonRows rows={3} />
    </div>
  );
}
