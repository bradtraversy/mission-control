"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 60_000;

// Network/data/* changes are filtered out of the global SSE refresh path
// (heartbeats + health JSONs are rewritten by cron every minute and would
// otherwise refresh every browser tab). This isolated client component
// triggers router.refresh() once a minute ONLY while the user is on /network,
// so the table reflects fresh cron output without spamming every other tab.
export function NetworkLiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
