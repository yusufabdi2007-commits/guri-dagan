import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );
}
