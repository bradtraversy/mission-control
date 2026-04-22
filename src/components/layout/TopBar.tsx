import { Command, Pause, RotateCw, Search, Zap } from "lucide-react";

export function TopBar() {
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

        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          <Pause size={13} strokeWidth={1.75} />
          Pause
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          <Zap size={13} strokeWidth={1.75} />
          Ping Travis
        </button>

        <button
          type="button"
          aria-label="Refresh"
          className="h-8 w-8 flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          <RotateCw size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
