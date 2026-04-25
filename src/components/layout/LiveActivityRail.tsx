export function LiveActivityRail() {
  return (
    <div className="h-full p-4 overflow-y-auto border-l border-border">
      <h2 className="text-[12px] font-medium tracking-[0.18em] uppercase text-muted mb-3">
        Live Activity
      </h2>
      <div className="text-sm text-muted leading-relaxed">
        Activity stream not yet wired. Will merge Claude and Travis session events plus task status transitions via SSE.
      </div>
    </div>
  );
}
