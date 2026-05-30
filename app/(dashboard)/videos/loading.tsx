import { Skeleton } from "@/components/ui/skeleton";

export default function VideosLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-xl flex-shrink-0" />)}
      </div>
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
  );
}
