import { Skeleton } from "@/components/ui/skeleton";

export default function GeneratorLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
