import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { AutomationsTable } from "@/components/network/AutomationsTable";
import { NetworkLiveRefresh } from "@/components/network/NetworkLiveRefresh";
import { formatRelativeTime, getNetworkSnapshot } from "@/lib";
import type {
  NetworkAutomation,
  NetworkGhost,
  NetworkMachine,
  NetworkOrphan,
  NetworkRegistryDrift,
  NetworkStagedAutomation,
} from "@/lib";

const LIGHT_STYLE: Record<NetworkAutomation["trafficLight"], string> = {
  green: "bg-emerald-400/20 text-emerald-300",
  yellow: "bg-amber-400/20 text-amber-300",
  red: "bg-rose-400/25 text-rose-300",
  unknown: "bg-surface-2 text-muted",
};

const OWNER_STYLE: Record<string, string> = {
  claude: "bg-slate-400/15 text-slate-300",
  cowork: "bg-orange-400/15 text-orange-300",
  sysadmin: "bg-sky-400/15 text-sky-300",
  creator: "bg-fuchsia-400/15 text-fuchsia-300",
  secretary: "bg-violet-400/15 text-violet-300",
  brad: "bg-emerald-400/15 text-emerald-300",
  system: "bg-surface-2 text-muted",
};

const OWNER_TOOLTIP: Record<string, string> = {
  claude: "Ask Claude Code directly. Edits vault skill files + re-registers.",
  cowork: "Ask Cowork (desktop Claude) directly. Same scheduled-tasks MCP capabilities as Claude Code.",
  sysadmin: "Hermes sysadmin profile. Queue Tasks with agent: sysadmin for homelab/network work.",
  creator: "Hermes creator profile. Owns content/research delivery jobs after cutover.",
  secretary: "Hermes secretary profile. Owns calendar/admin digest jobs after cutover.",
  brad: "Brad owns the source script/service — systemd timers, personal crons, account-level stuff.",
  system: "Ubuntu/Debian default — don't touch unless something specific breaks.",
};

const STATUS_DOT: Record<"ok" | "warn" | "down", string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  down: "bg-rose-400",
};

function usageColor(percent: number): string {
  if (percent >= 90) return "bg-rose-400";
  if (percent >= 75) return "bg-amber-400";
  return "bg-emerald-400/70";
}

function formatIso(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatRelativeTime(date);
}

export default async function Page() {
  const snapshot = await getNetworkSnapshot();
  const { connectivity, machines, automations, registryDrift, stagedAutomations } = snapshot;

  const onlineCount = machines.filter((m) => m.online && !m.stale).length;
  const overallStatus: "ok" | "warn" | "down" =
    connectivity.status === "up" && onlineCount === machines.length
      ? "ok"
      : connectivity.status === "down"
        ? "down"
        : "warn";

  const automationCounts = automations.reduce(
    (acc, a) => {
      acc[a.trafficLight] = (acc[a.trafficLight] ?? 0) + 1;
      return acc;
    },
    {} as Record<NetworkAutomation["trafficLight"], number>,
  );

  return (
    <div className="p-6 space-y-5">
      <NetworkLiveRefresh />
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Network</h1>
          <p className="text-[14px] text-muted">
            {machines.length} machines · {onlineCount} online · updated{" "}
            {formatIso(snapshot.lastUpdated)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[14px] text-muted">
            <span
              className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[overallStatus]}`}
            />
            {connectivity.status ?? "unknown"}
          </span>
          <span className="text-[13px] text-muted">
            gateway {connectivity.gatewayOk ? "✓" : "✗"} · internet{" "}
            {connectivity.internetOk ? "✓" : "✗"}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {machines.map((m) => (
          <MachineCard key={m.hostname} machine={m} />
        ))}
      </section>

      <RegistryDriftBanner drift={registryDrift} />

      <HermesStagingCard rows={stagedAutomations} />

      <Card>
        <CardHeader
          title="Automations"
          meta={`${automations.length} total · ${automationCounts.green ?? 0} ok · ${automationCounts.yellow ?? 0} warn · ${automationCounts.red ?? 0} fail · updated ${formatIso(snapshot.automationsUpdatedAt)}`}
        />
        <CardBody>
          <AutomationsTable
            rows={automations.map((a) => ({
              data: a,
              displayStatus: automationStatusLabel(a),
              lastRunRelative: formatIso(a.lastRun),
            }))}
            lightStyle={LIGHT_STYLE}
            ownerStyle={OWNER_STYLE}
            ownerTooltip={OWNER_TOOLTIP}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function HermesStagingCard({ rows }: { rows: NetworkStagedAutomation[] }) {
  if (rows.length === 0) return null;

  const activeCount = rows.filter((row) => row.state.toLowerCase() === "active").length;
  const pausedCount = rows.filter((row) => row.state.toLowerCase() === "paused").length;

  return (
    <Card>
      <CardHeader
        title="Hermes cutover staging"
        meta={`${rows.length} staged jobs · ${activeCount} active · ${pausedCount} paused`}
        action={
          <span className="text-[12px] px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-300">
            OpenClaw replacement path
          </span>
        }
      />
      <CardBody className="space-y-3">
        <p className="text-[13px] text-muted/80">
          Parsed from <code>Network/Automations.md</code>. Paused jobs are ready
          for cutover but should stay paused until the matching OpenClaw delivery
          job is disabled, otherwise Discord gets duplicate morning posts.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wider text-muted/60 border-b border-border">
                <th className="py-2 pr-3 font-medium">Profile</th>
                <th className="py-2 pr-3 font-medium">Job</th>
                <th className="py-2 pr-3 font-medium">Schedule</th>
                <th className="py-2 pr-3 font-medium">State</th>
                <th className="py-2 pr-3 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const state = row.state.toLowerCase();
                return (
                  <tr key={row.jobId} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3">
                      <span
                        className={`text-[12px] px-1.5 py-0.5 rounded font-mono ${OWNER_STYLE[row.profile] ?? "bg-surface-2 text-muted"}`}
                      >
                        {row.profile}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="text-foreground">{row.name}</div>
                      <div className="text-[12px] text-muted font-mono">{row.jobId}</div>
                    </td>
                    <td className="py-2 pr-3 text-muted font-mono text-[13px]">
                      {row.schedule}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`text-[12px] px-1.5 py-0.5 rounded ${
                          state === "active"
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-amber-400/15 text-amber-300"
                        }`}
                      >
                        {row.state}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted/80 max-w-[36ch] truncate">
                      {row.delivery}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function MachineCard({ machine }: { machine: NetworkMachine }) {
  const status: "ok" | "warn" | "down" = !machine.online
    ? "down"
    : machine.stale
      ? "warn"
      : "ok";

  return (
    <Card>
      <CardHeader
        title={machine.hostname}
        meta={machine.ip ?? undefined}
        action={
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
            />
            {status === "ok" ? "online" : status === "warn" ? "stale" : "down"}
          </span>
        }
      />
      <CardBody className="space-y-3">
        {machine.volumes.length > 0 ? (
          <div className="space-y-2">
            {machine.volumes.map((v) => (
              <div key={v.mount} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-mono text-muted">{v.mount}</span>
                  <span className="text-muted">
                    {v.usedGb} / {v.totalGb} GB ({v.percentUsed}%)
                  </span>
                </div>
                <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full ${usageColor(v.percentUsed)}`}
                    style={{ width: `${Math.min(100, v.percentUsed)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">No volumes reported.</p>
        )}

        {machine.services.length > 0 && (
          <div className="space-y-1">
            <div className="text-[12px] uppercase tracking-wider text-muted/60">
              Services
            </div>
            <ul className="flex flex-wrap gap-1">
              {machine.services.map((s) => {
                const ok = s.status === "active" || s.status === "running";
                return (
                  <li
                    key={s.name}
                    className={`text-[12px] px-1.5 py-0.5 rounded ${
                      ok
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-rose-400/20 text-rose-300"
                    }`}
                    title={s.description}
                  >
                    {s.name}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function automationStatusLabel(a: NetworkAutomation): string {
  // When systemd reports `ok` but no heartbeat has landed, the row is stale and
  // the amber color tells the truth — but the literal "ok" text in the pill
  // reads as healthy. Override with "stale" so the word matches the color.
  if (a.stale && (a.lastStatus === "ok" || a.lastStatus === null)) {
    return "stale";
  }
  return a.lastStatus ?? a.trafficLight;
}


function RegistryDriftBanner({ drift }: { drift: NetworkRegistryDrift }) {
  // No banner when there's nothing to say. The "unavailable" path still
  // surfaces though, because silently hiding drift detection failures defeats
  // the whole point of a backstop.
  if (drift.unavailableReason) {
    return (
      <Card>
        <CardHeader
          title="Registry drift"
          meta={`drift detection unavailable · last snapshot ${formatIso(drift.snapshotGeneratedAt)}`}
        />
        <CardBody>
          <p className="text-[13px] text-amber-300/90">
            {drift.unavailableReason}
          </p>
          <p className="text-[12px] text-muted/70 mt-1">
            The <code>scheduled-tasks-registry-sweep</code> MCP task writes the
            snapshot daily at 09:00 local. If this stays unavailable past one
            day, check the task&apos;s heartbeat and SKILL.md.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (drift.orphans.length === 0 && drift.ghosts.length === 0) {
    return null;
  }

  const orphanCount = drift.orphans.length;
  const ghostCount = drift.ghosts.length;
  const summary = [
    orphanCount > 0
      ? `${orphanCount} orphan${orphanCount === 1 ? "" : "s"}`
      : null,
    ghostCount > 0
      ? `${ghostCount} ghost${ghostCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardHeader
        title="Registry drift"
        meta={`${summary} · snapshot ${formatIso(drift.snapshotGeneratedAt)}`}
        action={
          <span className="text-[12px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
            needs attention
          </span>
        }
      />
      <CardBody className="space-y-3">
        {orphanCount > 0 && <OrphansTable rows={drift.orphans} />}
        {ghostCount > 0 && <GhostsTable rows={drift.ghosts} />}
        <p className="text-[12px] text-muted/70">
          Resolve via the{" "}
          <code className="text-muted">scheduled-task-setup</code> skill in the
          vault. Orphans = live MCP task with no registry entry → add a row to{" "}
          <code className="text-muted">automations.registry.json</code>. Ghosts
          = registry entry with no live MCP task → either re-create the task or
          remove the row.
        </p>
      </CardBody>
    </Card>
  );
}

function OrphansTable({ rows }: { rows: NetworkOrphan[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="text-[12px] uppercase tracking-wider text-muted/60 mb-1">
        Orphans · live MCP, no registry entry
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wider text-muted/60 border-b border-border">
            <th className="py-2 pr-3 font-medium">Task ID</th>
            <th className="py-2 pr-3 font-medium">Schedule</th>
            <th className="py-2 pr-3 font-medium">Enabled</th>
            <th className="py-2 pr-3 font-medium">Last Run</th>
            <th className="py-2 pr-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.taskId}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 pr-3 text-foreground font-mono text-[13px]">
                {o.taskId}
              </td>
              <td className="py-2 pr-3 text-muted">
                {o.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`text-[12px] px-1.5 py-0.5 rounded ${
                    o.enabled
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {o.enabled ? "yes" : "no"}
                </span>
              </td>
              <td className="py-2 pr-3 text-muted">{formatIso(o.lastRun)}</td>
              <td className="py-2 pr-3 text-muted/80 max-w-[40ch] truncate">
                {o.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GhostsTable({ rows }: { rows: NetworkGhost[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="text-[12px] uppercase tracking-wider text-muted/60 mb-1">
        Ghosts · registry entry, no live MCP task
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wider text-muted/60 border-b border-border">
            <th className="py-2 pr-3 font-medium">Registry ID</th>
            <th className="py-2 pr-3 font-medium">Owner</th>
            <th className="py-2 pr-3 font-medium">Schedule</th>
            <th className="py-2 pr-3 font-medium">MCP Task ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr
              key={g.registryId}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 pr-3 text-foreground font-mono text-[13px]">
                {g.registryId}
              </td>
              <td className="py-2 pr-3">
                {g.owner ? (
                  <span
                    className={`text-[12px] px-1.5 py-0.5 rounded font-mono ${OWNER_STYLE[g.owner] ?? "bg-surface-2 text-muted"}`}
                  >
                    {g.owner}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted/60">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-muted">
                {g.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted font-mono text-[13px]">
                {g.mcpTaskId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

