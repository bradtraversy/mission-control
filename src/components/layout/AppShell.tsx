import { LiveActivityRail } from "./LiveActivityRail";
import { LiveUpdater } from "./LiveUpdater";
import { ResizableRail } from "./ResizableRail";
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
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        <ResizableRail>
          <LiveActivityRail />
        </ResizableRail>
      </div>
    </div>
  );
}
