import {
  getAutomationHealth,
  getCurrentState,
  getDailyBriefing,
  getDigests,
  getServiceHealth,
  getSessions,
  getSponsorBrands,
  getTasks,
  getTodos,
} from "@/lib";

export async function fetchHomeData() {
  const [
    todos,
    tasks,
    sessions,
    digests,
    sponsorSnapshot,
    currentState,
    serviceHealth,
    automationHealth,
    todayBriefing,
  ] = await Promise.all([
    getTodos(),
    getTasks(),
    getSessions({ limit: 5 }),
    getDigests({ limit: 1 }),
    getSponsorBrands(),
    getCurrentState(),
    getServiceHealth(),
    getAutomationHealth(),
    getDailyBriefing(),
  ]);

  const { brands: sponsorBrands, totals: sponsorTotals } = sponsorSnapshot;
  const firstActiveDeal = sponsorBrands
    .flatMap((b) => b.activeDeals.map((d) => ({ brand: b, deal: d })))
    .map((row) => {
      const m = row.deal.detail.match(/(\d{4}-\d{2}-\d{2})/);
      return { ...row, due: m ? m[1] : null };
    })
    .filter((row) => row.due)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))[0];

  const queued = tasks.filter((t) => t.status === "queued");
  const claimed = tasks.filter((t) => t.status === "claimed");
  const done = tasks.filter((t) => t.status === "done");
  const activeTasks = [...claimed, ...queued].slice(0, 6);

  return {
    stats: {
      tasks: {
        queued: queued.length,
        claimed: claimed.length,
        done: done.length,
      },
      todosOpen: todos.now.filter((t) => !t.done).length,
      todosTotal: todos.now.length,
      sponsorOutstanding: sponsorTotals.outstandingUsd,
      nextSponsorDue: firstActiveDeal?.due ?? null,
      serviceHealth,
      automationHealth,
      latestDigest: digests[0] ?? null,
      lastSession: sessions[0] ?? null,
    },
    thisWeek: currentState.thisWeek,
    todayBriefing,
    sponsorBrands,
    todosNow: todos.now,
    activeTasks,
    recentSessions: sessions,
    recentDecisions: currentState.recentDecisions.slice(0, 3),
    latestDigest: digests[0] ?? null,
  };
}
