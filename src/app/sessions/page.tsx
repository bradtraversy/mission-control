import { SessionsList } from "@/components/sessions/SessionsList";
import { getSessions } from "@/lib";

export default async function Page() {
  const sessions = await getSessions();

  return (
    <div className="p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-lg font-medium tracking-tight">Sessions</h1>
        <p className="text-[13px] text-muted">
          Unified feed from Claude and Travis · {sessions.length} total ·
          newest first
        </p>
      </header>
      <SessionsList sessions={sessions} />
    </div>
  );
}
