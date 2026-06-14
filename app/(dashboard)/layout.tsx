import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { SearchModal } from "@/components/shared/SearchModal";
import { LiveTicker } from "@/components/shared/LiveTicker";
import { StoreBootstrap } from "@/components/providers/StoreBootstrap";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <StoreBootstrap />
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:px-6">{children}</main>
      </div>

      {/* live ticker pinned to the bottom on desktop (mobile uses bottom nav) */}
      <div className="fixed inset-x-0 bottom-0 z-20 hidden lg:block">
        <LiveTicker />
      </div>

      <MobileNav />
      <NotificationPanel />
      <SearchModal />
    </div>
  );
}
