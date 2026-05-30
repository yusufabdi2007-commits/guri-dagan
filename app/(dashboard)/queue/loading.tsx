import { Skeleton } from "@/components/ui/skeleton";

export default function QueueLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-10 w-full rounded-xl" />
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
}
