import { Header } from "@/components/layout/Header";
import { GeneratorClient } from "@/components/generator/GeneratorClient";

export default function GeneratorPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="AI Generator" subtitle="Create content with AI" />
      <GeneratorClient />
    </div>
  );
}
