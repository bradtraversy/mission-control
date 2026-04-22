import {
  getAutomationHealth,
  getCurrentState,
  getDigests,
  getServiceHealth,
  getSessions,
  getSponsors,
  getTasks,
  getTodos,
} from "@/lib";

export async function fetchHomeData() {
  const [
    todos,
    tasks,
    sessions,
    digests,
    sponsors,
    currentState,
    serviceHealth,
    automationHealth,
  ] = await Promise.all([
    getTodos(),
    getTasks(),
    getSessions({ limit: 5 }),
    getDigests({ limit: 1 }),
    getSponsors(),
    getCurrentState(),
    getServiceHealth(),
    getAutomationHealth(),
  ]);

  const totalSponsorOutstanding = sponsors.reduce(
    (sum, row) => sum + row.outstandingUsd,
    0,
  );
  const firstActiveSponsor = sponsors.find((s) => !s.isDone);

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
      sponsorOutstanding: totalSponsorOutstanding,
      nextSponsorDue: firstActiveSponsor?.due ?? null,
      serviceHealth,
      automationHealth,
      latestDigest: digests[0] ?? null,
      lastSession: sessions[0] ?? null,
    },
    thisWeek: currentState.thisWeek,
    sponsors,
    todosNow: todos.now,
    activeTasks,
    recentSessions: sessions,
    recentDecisions: currentState.recentDecisions.slice(0, 3),
    latestDigest: digests[0] ?? null,
  };
}
