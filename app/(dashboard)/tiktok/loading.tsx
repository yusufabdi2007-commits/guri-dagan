import { Skeleton } from "@/components/ui/skeleton";

export default function TikTokLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );
}
