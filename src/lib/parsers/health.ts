import fs from "node:fs/promises";
import { resolveVaultRelativePath } from "../vault";

export type ServiceHealth = {
  totalServices: number;
  activeServices: number;
  lastUpdated: string | null;
};

export type AutomationHealth = {
  total: number;
  green: number;
  yellow: number;
  red: number;
  unknown: number;
  lastUpdated: string | null;
};

export async function getServiceHealth(): Promise<ServiceHealth> {
  try {
    const raw = await fs.readFile(
      resolveVaultRelativePath("Network/data/service-health.json"),
      "utf-8",
    );
    const data = JSON.parse(raw) as {
      last_updated?: string;
      machines?: Array<{
        services?: Array<{ status?: string }>;
      }>;
    };
    let total = 0;
    let active = 0;
    for (const m of data.machines ?? []) {
      for (const s of m.services ?? []) {
        total += 1;
        if (s.status === "active") active += 1;
      }
    }
    return {
      totalServices: total,
      activeServices: active,
      lastUpdated: data.last_updated ?? null,
    };
  } catch {
    return { totalServices: 0, activeServices: 0, lastUpdated: null };
  }
}

export async function getAutomationHealth(): Promise<AutomationHealth> {
  try {
    const raw = await fs.readFile(
      resolveVaultRelativePath("Network/data/automations-health.json"),
      "utf-8",
    );
    const data = JSON.parse(raw) as {
      generated_at?: string;
      tasks?: Array<{ traffic_light?: string }>;
    };
    const counts = { green: 0, yellow: 0, red: 0, unknown: 0 };
    for (const t of data.tasks ?? []) {
      const light = (t.traffic_light ?? "").toLowerCase();
      if (light === "green") counts.green += 1;
      else if (light === "yellow") counts.yellow += 1;
      else if (light === "red") counts.red += 1;
      else counts.unknown += 1;
    }
    const total =
      counts.green + counts.yellow + counts.red + counts.unknown;
    return { total, ...counts, lastUpdated: data.generated_at ?? null };
  } catch {
    return {
      total: 0,
      green: 0,
      yellow: 0,
      red: 0,
      unknown: 0,
      lastUpdated: null,
    };
  }
}
