import fs from "node:fs/promises";
import { resolveVaultRelativePath } from "../vault";

export type NetworkVolume = {
  mount: string;
  totalGb: number;
  usedGb: number;
  freeGb: number;
  percentUsed: number;
};

export type NetworkMachine = {
  hostname: string;
  ip: string | null;
  online: boolean;
  stale: boolean;
  lastSeen: string | null;
  volumes: NetworkVolume[];
  services: { name: string; status: string; description?: string }[];
};

export type NetworkConnectivity = {
  lastChecked: string | null;
  status: string | null;
  gatewayOk: boolean | null;
  internetOk: boolean | null;
};

export type NetworkAutomation = {
  id: string;
  name: string;
  owner: string | null;
  host: string | null;
  scheduleHuman: string | null;
  lastRun: string | null;
  lastStatus: string | null;
  detail: string | null;
  trafficLight: "green" | "yellow" | "red" | "unknown";
  stale: boolean;
};

export type NetworkCronJob = {
  host: string;
  name: string;
  scheduleHuman: string | null;
  command: string | null;
  source: string | null;
  lastRan: number | null;
  nextRun: number | null;
  lastStatus: string | null;
};

export type NetworkSnapshot = {
  connectivity: NetworkConnectivity;
  machines: NetworkMachine[];
  automations: NetworkAutomation[];
  automationsUpdatedAt: string | null;
  crons: NetworkCronJob[];
  cronsUpdatedAt: string | null;
  lastUpdated: string | null;
};

async function readJson<T>(relative: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(
      resolveVaultRelativePath(relative),
      "utf-8",
    );
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toTrafficLight(value: unknown): NetworkAutomation["trafficLight"] {
  const v = String(value ?? "").toLowerCase();
  if (v === "green" || v === "yellow" || v === "red") return v;
  return "unknown";
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  const [connectivityRaw, diskRaw, servicesRaw, automationsRaw, cronsRaw] =
    await Promise.all([
      readJson<{
        last_checked?: string;
        status?: string;
        gateway_ok?: boolean;
        internet_ok?: boolean;
      }>("Network/data/connectivity-state.json"),
      readJson<{
        last_updated?: string;
        machines?: Array<{
          hostname: string;
          ip?: string;
          online?: boolean;
          stale?: boolean;
          last_seen?: string;
          volumes?: Array<{
            mount?: string;
            total_gb?: number;
            used_gb?: number;
            free_gb?: number;
            percent_used?: number;
          }>;
        }>;
      }>("Network/data/disk-stats.json"),
      readJson<{
        machines?: Array<{
          hostname: string;
          services?: Array<{
            name: string;
            status?: string;
            description?: string;
          }>;
        }>;
      }>("Network/data/service-health.json"),
      readJson<{
        generated_at?: string;
        tasks?: Array<{
          id: string;
          name?: string;
          owner?: string;
          host?: string;
          schedule_human?: string;
          last_run?: string | null;
          last_status?: string;
          detail?: string;
          traffic_light?: string;
          stale?: boolean;
        }>;
      }>("Network/data/automations-health.json"),
      readJson<{
        last_updated?: string;
        machines?: Array<{
          hostname: string;
          jobs?: Array<{
            name: string;
            schedule_human?: string;
            command?: string;
            source?: string;
            last_ran?: number | null;
            next_run?: number | null;
            last_status?: string;
          }>;
        }>;
      }>("Network/data/cron-jobs.json"),
    ]);

  const servicesByHost = new Map<
    string,
    { name: string; status: string; description?: string }[]
  >();
  for (const m of servicesRaw?.machines ?? []) {
    servicesByHost.set(
      m.hostname,
      (m.services ?? []).map((s) => ({
        name: s.name,
        status: s.status ?? "unknown",
        description: s.description,
      })),
    );
  }

  const machines: NetworkMachine[] = (diskRaw?.machines ?? []).map((m) => ({
    hostname: m.hostname,
    ip: m.ip ?? null,
    online: Boolean(m.online),
    stale: Boolean(m.stale),
    lastSeen: m.last_seen ?? null,
    volumes: (m.volumes ?? []).map((v) => ({
      mount: v.mount ?? "?",
      totalGb: v.total_gb ?? 0,
      usedGb: v.used_gb ?? 0,
      freeGb: v.free_gb ?? 0,
      percentUsed: v.percent_used ?? 0,
    })),
    services: servicesByHost.get(m.hostname) ?? [],
  }));

  const automations: NetworkAutomation[] = (automationsRaw?.tasks ?? []).map(
    (t) => ({
      id: t.id,
      name: t.name ?? t.id,
      owner: t.owner ?? null,
      host: t.host ?? null,
      scheduleHuman: t.schedule_human ?? null,
      lastRun: t.last_run ?? null,
      lastStatus: t.last_status ?? null,
      detail: t.detail ?? null,
      trafficLight: toTrafficLight(t.traffic_light),
      stale: Boolean(t.stale),
    }),
  );

  const crons: NetworkCronJob[] = [];
  for (const m of cronsRaw?.machines ?? []) {
    for (const j of m.jobs ?? []) {
      crons.push({
        host: m.hostname,
        name: j.name,
        scheduleHuman: j.schedule_human ?? null,
        command: j.command ?? null,
        source: j.source ?? null,
        lastRan: j.last_ran ?? null,
        nextRun: j.next_run ?? null,
        lastStatus: j.last_status ?? null,
      });
    }
  }

  return {
    connectivity: {
      lastChecked: connectivityRaw?.last_checked ?? null,
      status: connectivityRaw?.status ?? null,
      gatewayOk: connectivityRaw?.gateway_ok ?? null,
      internetOk: connectivityRaw?.internet_ok ?? null,
    },
    machines,
    automations,
    automationsUpdatedAt: automationsRaw?.generated_at ?? null,
    crons,
    cronsUpdatedAt: cronsRaw?.last_updated ?? null,
    lastUpdated: diskRaw?.last_updated ?? null,
  };
}
