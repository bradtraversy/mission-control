import { LiveActivityRail } from "./LiveActivityRail";
import { LiveUpdater } from "./LiveUpdater";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <LiveUpdater />
      <header className="h-12 shrink-0">
        <TopBar />
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-56 shrink-0 border-r border-border">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        <aside className="w-80 shrink-0 hidden lg:block">
          <LiveActivityRail />
        </aside>
      </div>
    </div>
  );
}
