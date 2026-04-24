import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatRelativeTime, getNetworkSnapshot } from "@/lib";
import type {
  NetworkAutomation,
  NetworkCronJob,
  NetworkMachine,
} from "@/lib";

const LIGHT_STYLE: Record<NetworkAutomation["trafficLight"], string> = {
  green: "bg-emerald-400/20 text-emerald-300",
  yellow: "bg-amber-400/20 text-amber-300",
  red: "bg-rose-400/25 text-rose-300",
  unknown: "bg-surface-2 text-muted",
};

const OWNER_STYLE: Record<string, string> = {
  claude: "bg-slate-400/15 text-slate-300",
  cowork: "bg-indigo-400/15 text-indigo-300",
  travis: "bg-accent/15 text-accent",
  brad: "bg-emerald-400/15 text-emerald-300",
  system: "bg-surface-2 text-muted",
};

const OWNER_TOOLTIP: Record<string, string> = {
  claude: "Ask Claude Code directly. Edits vault skill files + re-registers.",
  cowork: "Ask Cowork (desktop Claude) directly. Same scheduled-tasks MCP capabilities as Claude Code.",
  travis: "Ask Travis in OpenClaw, or queue a Tasks/<date>-<slug>.md with agent: travis.",
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

function formatTimestamp(ms: number | null): string {
  if (!ms) return "—";
  return formatRelativeTime(new Date(ms));
}

function formatIso(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatRelativeTime(date);
}

export default async function Page() {
  const snapshot = await getNetworkSnapshot();
  const { connectivity, machines, automations, crons } = snapshot;

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
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-lg font-medium tracking-tight">Network</h1>
          <p className="text-[12px] text-muted">
            {machines.length} machines · {onlineCount} online · updated{" "}
            {formatIso(snapshot.lastUpdated)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <span
              className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[overallStatus]}`}
            />
            {connectivity.status ?? "unknown"}
          </span>
          <span className="text-[11px] text-muted">
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

      <Card>
        <CardHeader
          title="Automations"
          meta={`${automations.length} total · ${automationCounts.green ?? 0} ok · ${automationCounts.yellow ?? 0} warn · ${automationCounts.red ?? 0} fail · updated ${formatIso(snapshot.automationsUpdatedAt)}`}
        />
        <CardBody>
          <AutomationsTable rows={automations} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Cron Jobs"
          meta={`${crons.length} jobs · updated ${formatIso(snapshot.cronsUpdatedAt)}`}
        />
        <CardBody>
          <CronsTable rows={crons} />
        </CardBody>
      </Card>
    </div>
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
          <span className="flex items-center gap-1.5 text-[10px] text-muted">
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
                <div className="flex items-center justify-between text-[11px]">
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
          <p className="text-[11px] text-muted">No volumes reported.</p>
        )}

        {machine.services.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted/60">
              Services
            </div>
            <ul className="flex flex-wrap gap-1">
              {machine.services.map((s) => {
                const ok = s.status === "active" || s.status === "running";
                return (
                  <li
                    key={s.name}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
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

function AutomationsTable({ rows }: { rows: NetworkAutomation[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-muted py-2">
        No automations reported in <code>automations-health.json</code>.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted/60 border-b border-border">
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Owner</th>
            <th className="py-2 pr-3 font-medium">Host</th>
            <th className="py-2 pr-3 font-medium">Schedule</th>
            <th className="py-2 pr-3 font-medium">Last Run</th>
            <th className="py-2 pr-3 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${LIGHT_STYLE[a.trafficLight]}`}
                >
                  {a.lastStatus ?? a.trafficLight}
                </span>
              </td>
              <td className="py-2 pr-3 text-foreground">{a.name}</td>
              <td className="py-2 pr-3">
                {a.owner ? (
                  <span
                    title={OWNER_TOOLTIP[a.owner] ?? ""}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${OWNER_STYLE[a.owner] ?? "bg-surface-2 text-muted"}`}
                  >
                    {a.owner}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted/60">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-muted font-mono">
                {a.host ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted">
                {a.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted">{formatIso(a.lastRun)}</td>
              <td className="py-2 pr-3 text-muted/80 max-w-[32ch] truncate">
                {a.detail ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CronsTable({ rows }: { rows: NetworkCronJob[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-muted py-2">
        No cron jobs reported in <code>cron-jobs.json</code>.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted/60 border-b border-border">
            <th className="py-2 pr-3 font-medium">Host</th>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Schedule</th>
            <th className="py-2 pr-3 font-medium">Last Ran</th>
            <th className="py-2 pr-3 font-medium">Next Run</th>
            <th className="py-2 pr-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr
              key={`${c.host}-${c.name}-${i}`}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 pr-3 text-muted font-mono">{c.host}</td>
              <td className="py-2 pr-3 text-foreground">{c.name}</td>
              <td className="py-2 pr-3 text-muted">
                {c.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted">
                {formatTimestamp(c.lastRan)}
              </td>
              <td className="py-2 pr-3 text-muted">
                {formatTimestamp(c.nextRun)}
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.lastStatus === "ok"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : c.lastStatus
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {c.lastStatus ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
