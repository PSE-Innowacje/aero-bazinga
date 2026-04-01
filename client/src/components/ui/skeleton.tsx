import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/50", className)}
      {...props}
    />
  );
}

/** Skeleton for a list page: heading + table rows */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <div className="mb-xl flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <div className="rounded-md border border-border">
        {/* Header */}
        <div className="flex gap-md border-b border-border bg-surface px-md py-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-md border-b border-border-subtle px-md py-sm">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a form page: heading + fields */
export function FormSkeleton() {
  return (
    <div className="max-w-3xl">
      <Skeleton className="mb-lg h-4 w-32" />
      <Skeleton className="mb-xl h-7 w-56" />
      <div className="space-y-md">
        <div>
          <Skeleton className="mb-xs h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div>
          <Skeleton className="mb-xs h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Skeleton className="mb-xs h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div>
            <Skeleton className="mb-xs h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <Skeleton className="mt-md h-11 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton for a detail page: heading + info cards */
export function DetailSkeleton() {
  return (
    <div className="max-w-3xl">
      <Skeleton className="mb-lg h-4 w-32" />
      <div className="mb-xl flex items-center gap-md">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-md mb-xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-xs h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

/** Skeleton for dashboard: stat cards + table */
export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-lg">
        <Skeleton className="h-7 w-64 mb-xs" />
        <Skeleton className="h-5 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-white p-md">
            <Skeleton className="h-3 w-24 mb-sm" />
            <Skeleton className="h-8 w-16 mb-xs" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-xl h-5 w-40 mb-md" />
      <div className="rounded-lg border border-border bg-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-md px-md py-sm border-b border-border-subtle">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton };
