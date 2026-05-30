import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
