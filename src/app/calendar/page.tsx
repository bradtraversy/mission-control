import {
  buildObsidianUri,
  formatRelativeTime,
  getCalendarSnapshot,
} from "@/lib";
import type { CalendarEvent, CalendarEventFlag } from "@/lib";

const FLAG_LABEL: Record<CalendarEventFlag, string> = {
  "all-day": "all-day",
  recurring: "recurring",
  informational: "informational",
};

function formatLastRefreshed(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `Synced ${formatRelativeTime(date)}`;
}

export default async function Page() {
  const snapshot = await getCalendarSnapshot();
  const obsidianUri = buildObsidianUri("Calendar/Upcoming.md");

  if (!snapshot.exists) {
    return (
      <div className="p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Calendar</h1>
          <p className="text-[14px] text-muted">
            Calendar sync not set up — ask Travis.
          </p>
        </header>
        <p className="text-[14px] text-muted">
          Expected at <code>Calendar/Upcoming.md</code>. Travis runs a scheduled
          task (every 30 min) that mirrors the next 14 days of Google Calendar
          events into that file.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Calendar</h1>
          <p className="text-[14px] text-muted">
            {snapshot.total} {snapshot.total === 1 ? "event" : "events"} in the
            next 14 days{snapshot.source ? ` · ${snapshot.source}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">
            {formatLastRefreshed(snapshot.lastRefreshed)}
          </span>
          <a
            href={obsidianUri}
            className="text-[13px] text-muted hover:text-foreground"
          >
            Open in Obsidian ↗
          </a>
        </div>
      </header>

      <Section title="This week" events={snapshot.thisWeek} />
      <Section title="Next week" events={snapshot.nextWeek} />
      {snapshot.later.length > 0 && (
        <Section title="Later" events={snapshot.later} />
      )}
    </div>
  );
}

function Section({
  title,
  events,
}: {
  title: string;
  events: CalendarEvent[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[12px] font-medium tracking-[0.18em] uppercase text-muted">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="text-[14px] text-muted/70 pl-0.5">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-border/50 border border-border rounded-md bg-surface/40">
          {events.map((e, i) => (
            <li
              key={`${e.dayLabel}-${e.title}-${i}`}
              className="px-3 py-2.5 flex items-start gap-3 flex-wrap"
            >
              <div className="shrink-0 min-w-[5.5rem]">
                <div className="text-[14px] text-foreground font-mono">
                  {e.dayLabel}
                </div>
                {e.timeRange && (
                  <div className="text-[12px] text-muted font-mono">
                    {e.timeRange}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-base text-foreground">{e.title}</div>
                {(e.project || e.tags.length > 0 || e.flags.length > 0) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {e.flags.map((f) => (
                      <span
                        key={f}
                        className="text-[12px] px-1.5 py-0.5 rounded bg-surface-2 text-muted"
                      >
                        {FLAG_LABEL[f]}
                      </span>
                    ))}
                    {e.project && (
                      <a
                        href={buildObsidianUri(`${e.project.target}.md`)}
                        className="text-[13px] text-accent hover:underline"
                        title={e.project.target}
                      >
                        → {e.project.display}
                      </a>
                    )}
                    {e.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[12px] px-1.5 py-0.5 rounded bg-surface-2 text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
