import { Header } from "@/components/layout/Header";
import { TrendsClient } from "@/components/trends/TrendsClient";

export default function TrendsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Trends & Topics" subtitle="What Somali parents need right now" />
      <TrendsClient />
    </div>
  );
}
