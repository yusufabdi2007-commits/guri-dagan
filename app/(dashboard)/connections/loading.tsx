import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectionsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
