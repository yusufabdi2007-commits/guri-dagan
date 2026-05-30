import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 glass border-b border-border/50 px-4 py-3 -mx-4 md:-mx-6 md:px-6 mb-2">
        <Skeleton className="h-6 w-32" />
      </div>
      {/* Streak hero */}
      <Skeleton className="h-40 w-full rounded-2xl" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      {/* Progress */}
      <Skeleton className="h-20 rounded-2xl" />
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      {/* Ideas list */}
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
