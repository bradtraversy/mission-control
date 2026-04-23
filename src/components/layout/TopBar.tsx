import { Command, Search } from "lucide-react";
import { getTaskControl } from "@/lib/parsers/tasks";
import { PauseToggle } from "./PauseToggle";
import { PingTravisButton } from "./PingTravisButton";
import { RefreshButton } from "./RefreshButton";

export async function TopBar() {
  const control = await getTaskControl();

  return (
    <div className="h-full flex items-center justify-between px-4 border-b border-border">
      <div className="flex items-center gap-2">
        <Command size={16} className="text-accent" strokeWidth={2} />
        <span className="text-sm font-medium tracking-tight">Mission Control</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 h-8 px-3 rounded-md bg-surface border border-border text-xs text-muted hover:text-foreground hover:border-surface-2 transition-colors"
        >
          <Search size={13} strokeWidth={1.75} />
          <span>Search</span>
          <kbd className="ml-8 text-[10px] text-muted/70">⌘K</kbd>
        </button>

        <PauseToggle paused={control.paused} />
        <PingTravisButton />

        <RefreshButton />
      </div>
    </div>
  );
}
