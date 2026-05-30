import { Skeleton } from "@/components/ui/skeleton";

export default function StreakLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
