import { Skeleton } from "@/components/ui/skeleton";

export default function StrategistLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 flex-1 rounded-xl" />)}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );
}
