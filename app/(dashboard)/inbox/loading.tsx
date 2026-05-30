import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
}
