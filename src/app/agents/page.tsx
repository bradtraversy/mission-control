import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { buildObsidianUri, getAgents } from "@/lib";
import type { AgentEntry } from "@/lib";

const PLACEHOLDER_RE = /<fill in\b[^>]*>/gi;

function NeedsContentPill({ label = "needs content" }: { label?: string }) {
  return (
    <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-300/80 italic">
      {label}
    </span>
  );
}

function renderBody(text: string): string {
  return text.replace(PLACEHOLDER_RE, "*⟨needs content⟩*");
}

function countPlaceholders(text: string): number {
  const matches = text.match(PLACEHOLDER_RE);
  return matches ? matches.length : 0;
}

function AgentCard({ agent }: { agent: AgentEntry }) {
  return (
    <Card className="h-full">
      <CardHeader
        title={agent.name}
        action={agent.hasPlaceholder ? <NeedsContentPill /> : undefined}
      />
      <CardBody className="space-y-3">
        {agent.fields.length > 0 && (
          <dl className="space-y-1.5 text-[12px]">
            {agent.fields.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-[80px_1fr] gap-2 items-baseline"
              >
                <dt className="text-muted/80 text-[11px] uppercase tracking-wider">
                  {field.label}
                </dt>
                <dd className="text-foreground/90">
                  {field.isPlaceholder ? (
                    <NeedsContentPill />
                  ) : (
                    field.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {agent.body && (
          <div className="pt-2 border-t border-border/60">
            <MarkdownBody content={renderBody(agent.body)} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default async function Page() {
  const snapshot = await getAgents();
  const obsidianUri = buildObsidianUri(snapshot.relativePath);

  if (!snapshot.exists) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-lg font-medium tracking-tight">Agents</h1>
        <p className="text-sm text-muted">
          <code>{snapshot.relativePath}</code> not found in the vault. Create the
          file to populate this tab.
        </p>
      </div>
    );
  }

  const totalPlaceholders =
    countPlaceholders(snapshot.mission.body) +
    snapshot.roster.reduce(
      (acc, a) =>
        acc +
        a.fields.filter((f) => f.isPlaceholder).length +
        countPlaceholders(a.body),
      0,
    );

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-lg font-medium tracking-tight">Agents</h1>
          <p className="text-[12px] text-muted">
            {snapshot.roster.length} in roster · sourced from{" "}
            <code>{snapshot.relativePath}</code>
            {totalPlaceholders > 0 && (
              <>
                {" · "}
                <span className="text-amber-300/80">
                  {totalPlaceholders} field{totalPlaceholders === 1 ? "" : "s"}{" "}
                  needs content
                </span>
              </>
            )}
          </p>
        </div>
        <a
          href={obsidianUri}
          className="text-[11px] text-muted hover:text-foreground"
        >
          Edit in Obsidian ↗
        </a>
      </header>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-medium tracking-[0.15em] uppercase text-muted">
            Mission
          </h2>
          {snapshot.mission.hasPlaceholder && <NeedsContentPill />}
        </div>
        <Card>
          <CardBody>
            {snapshot.mission.body ? (
              <MarkdownBody content={renderBody(snapshot.mission.body)} />
            ) : (
              <p className="text-sm text-muted italic">
                No mission statement yet.
              </p>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-medium tracking-[0.15em] uppercase text-muted">
          Roster
        </h2>
        {snapshot.roster.length === 0 ? (
          <p className="text-sm text-muted italic">
            No agents defined. Add <code>### &lt;Name&gt;</code> sections under{" "}
            <code>## Roster</code> in <code>{snapshot.relativePath}</code>.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snapshot.roster.map((agent) => (
              <AgentCard key={agent.slug} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {snapshot.routing && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-medium tracking-[0.15em] uppercase text-muted">
            Routing rules
          </h2>
          <Card>
            <CardBody>
              <MarkdownBody content={renderBody(snapshot.routing)} />
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
