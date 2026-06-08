import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FAB } from "@/components/ui/FAB";
import { PageTransition } from "@/components/layout/PageTransition";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FrictionButton } from "@/components/layout/FrictionButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <ErrorBoundary label="this page">
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </main>
      <BottomNav />
      <FAB />
      <FrictionButton />
      <PullToRefresh />
    </div>
  );
}
