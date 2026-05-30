import { Skeleton } from "@/components/ui/skeleton";

export default function TranscriptLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );
}
