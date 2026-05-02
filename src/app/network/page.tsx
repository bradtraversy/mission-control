import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatRelativeTime, getNetworkSnapshot } from "@/lib";
import type {
  NetworkAutomation,
  NetworkMachine,
  NetworkRegistryDrift,
} from "@/lib";
import { AutomationsTable, GhostsTable, OrphansTable } from "./Tables";

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
  const { connectivity, machines, automations, registryDrift } = snapshot;

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

      <Card>
        <CardHeader
          title="Automations"
          meta={`${automations.length} total · ${automationCounts.green ?? 0} ok · ${automationCounts.yellow ?? 0} warn · ${automationCounts.red ?? 0} fail · updated ${formatIso(snapshot.automationsUpdatedAt)}`}
        />
        <CardBody>
          <AutomationsTable rows={automations} />
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

function RegistryDriftBanner({ drift }: { drift: NetworkRegistryDrift }) {
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
