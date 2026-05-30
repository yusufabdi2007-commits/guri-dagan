import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 rounded-xl" />
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
}
