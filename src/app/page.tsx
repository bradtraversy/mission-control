export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col gap-3 text-center">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Travx Labs
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">Mission Control</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Scaffold online. Phase 1 build starting.
        </p>
      </div>
    </main>
  );
}
