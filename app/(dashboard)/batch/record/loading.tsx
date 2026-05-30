import { Skeleton } from "@/components/ui/skeleton";

export default function BatchRecordLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  );
}
