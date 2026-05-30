import { Skeleton } from "@/components/ui/skeleton";

export default function RepurposeLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 flex-1 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
