import { Skeleton } from "@/components/ui/skeleton";

export default function HookScorerLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
