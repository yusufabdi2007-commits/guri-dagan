import { Header } from "@/components/layout/Header";
import { HookScorerClient } from "@/components/hook-scorer/HookScorerClient";

export default function HookScorerPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Hook Scorer" subtitle="Score and improve your hooks with AI" />
      <HookScorerClient />
    </div>
  );
}
