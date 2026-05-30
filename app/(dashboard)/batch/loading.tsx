import { Skeleton } from "@/components/ui/skeleton";

export default function BatchLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
      </div>
    </div>
  );
}
