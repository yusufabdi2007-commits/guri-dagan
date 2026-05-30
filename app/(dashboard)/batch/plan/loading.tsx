import { Skeleton } from "@/components/ui/skeleton";

export default function BatchPlanLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
