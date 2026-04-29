import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { DailyBriefing } from "@/lib";

type Props = {
  briefing: DailyBriefing | null;
};

export function TodaysFocusPanel({ briefing }: Props) {
  return (
    <Card>
      <CardHeader
        title="Today's Focus"
        meta={
          briefing?.lastUpdate
            ? `Updated ${briefing.lastUpdate}`
            : briefing?.generatedAt
              ? `Generated ${briefing.generatedAt}`
              : undefined
        }
      />
      <CardBody className="space-y-3">
        {!briefing ? <EmptyState /> : <Body briefing={briefing} />}
      </CardBody>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="text-[14px] text-muted leading-relaxed">
      <span className="text-foreground/90 font-medium">
        No briefing yet for today.
      </span>{" "}
      Run <code className="text-accent">/morning</code> in Cowork or Claude
      Code to generate.
    </p>
  );
}

function Body({ briefing }: { briefing: DailyBriefing }) {
  return (
    <div className="space-y-3">
      <CalendarStrip
        events={briefing.calendar}
        empty={briefing.calendarEmpty}
      />
      <SuggestedOrder items={briefing.suggestedOrder} />
    </div>
  );
}

function CalendarStrip({
  events,
  empty,
}: {
  events: DailyBriefing["calendar"];
  empty: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted/60">
        Today&apos;s calendar
      </div>
      {events.length === 0 ? (
        <p className="text-[13px] text-muted/60 italic">
          {empty ? "No events today" : "—"}
        </p>
      ) : (
        <ul className="space-y-1">
          {events.map((e, i) => (
            <li
              key={`${e.time}-${i}`}
              className="flex items-baseline gap-2 text-[13px]"
            >
              <span className="font-mono text-accent shrink-0 w-[110px]">
                {e.time}
              </span>
              <span className="text-foreground/90 truncate">{e.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestedOrder({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted/60">
          Suggested order
        </div>
        <p className="text-[13px] text-muted/60 italic">
          No suggested order in the briefing.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted/60">
        Suggested order
      </div>
      <ol className="space-y-1.5 list-none">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] leading-snug"
          >
            <span className="font-mono text-muted/60 shrink-0 mt-0.5">
              {i + 1}.
            </span>
            <span className="text-foreground/90">
              <SuggestedItemText text={item} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// The skill writes items like "**Quick wins before the tattoo**: confirm Expo
// payment landed; ping Hostinger." Render the bolded lead in the foreground
// and the rest in a softer tone so the eye finds the action quickly.
function SuggestedItemText({ text }: { text: string }) {
  const m = text.match(/^\*\*(.+?)\*\*\s*(?:[:—–-]\s*)?(.*)$/);
  if (!m) return <>{text}</>;
  const head = m[1].trim();
  const tail = m[2].trim();
  return (
    <>
      <span className="font-medium text-foreground">{head}</span>
      {tail && (
        <>
          <span className="text-muted/70"> · </span>
          <span className="text-muted">{tail}</span>
        </>
      )}
    </>
  );
}
