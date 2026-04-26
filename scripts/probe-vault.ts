/**
 * Runs every vault parser against the real vault and prints a compact
 * summary of what came back. Useful for sanity-checking the parsing
 * shape without wiring the lib into any UI.
 *
 *   pnpm probe:vault
 */
import {
  getTodos,
  getTasks,
  getTaskControl,
  getProjects,
  getSessions,
  getDigests,
  getNetworkFeeds,
  getCurrentState,
  getSponsors,
  getServiceHealth,
  getAutomationHealth,
  formatUsd,
} from "../src/lib";

const heading = (title: string): void => {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
};

async function main(): Promise<void> {
  heading("TODOS");
  const todos = await getTodos();
  console.log(
    `now=${todos.now.length} soon=${todos.soon.length} later=${todos.later.length} nextId=${todos.nextId}`,
  );
  if (todos.now[0]) {
    const t = todos.now[0];
    console.log(
      `  sample now[0]: #${t.id} done=${t.done} tags=[${t.tags.join(",")}] text="${t.text.slice(0, 60)}"`,
    );
  }

  heading("TASKS");
  const tasks = await getTasks();
  console.log(`active tasks: ${tasks.length}`);
  for (const t of tasks.slice(0, 5)) {
    console.log(
      `  ${t.status.padEnd(7)} ${t.agent.padEnd(7)} ref=${t.refTodo ? `${t.refTodo.column}#${t.refTodo.id}` : "-"} · ${t.title}`,
    );
  }
  const control = await getTaskControl();
  console.log(`  control: paused=${control.paused}`);

  heading("PROJECTS");
  const projects = await getProjects();
  console.log(`projects: ${projects.length}`);
  console.log(`  names: ${projects.map((p) => p.name).join(", ")}`);

  heading("SESSIONS (latest 5)");
  const sessions = await getSessions({ limit: 5 });
  for (const s of sessions) {
    console.log(
      `  ${s.source.padEnd(8)} ${s.frontmatter.date ?? "????"} · ${s.slug}`,
    );
  }

  heading("DIGESTS (latest 3)");
  const digests = await getDigests({ limit: 3 });
  for (const d of digests) {
    console.log(`  ${d.frontmatter.date ?? "????"} · ${d.relativePath}`);
  }

  heading("NETWORK FEEDS");
  const feeds = await getNetworkFeeds();
  for (const f of feeds) {
    console.log(`  ${f.filename.padEnd(36)} ${f.mtime.toISOString()}`);
  }

  heading("CURRENT STATE");
  const cs = await getCurrentState();
  console.log(`  thisWeek (top 3):`);
  for (const item of cs.thisWeek) {
    const tag = item.group ? `[${item.group}] ` : "";
    console.log(`    - ${tag}${item.text.slice(0, 90)}`);
  }
  console.log(
    `  immediateActions=${cs.immediateActions.length} recentDecisions=${cs.recentDecisions.length} openQuestions=${cs.openQuestions.length}`,
  );
  console.log(`  sponsorsRaw preview: ${cs.sponsorsRaw.split("\n")[0] ?? ""}`);

  heading("SPONSORS");
  const sponsors = await getSponsors();
  for (const s of sponsors) {
    console.log(
      `  ${s.name.padEnd(12)} ${formatUsd(s.paidUsd).padStart(5)}/${formatUsd(s.totalUsd).padStart(5)} · ${s.isDone ? "done" : "open"} · due=${s.due}`,
    );
  }
  const totalOutstanding = sponsors.reduce(
    (sum, s) => sum + s.outstandingUsd,
    0,
  );
  console.log(`  total outstanding: ${formatUsd(totalOutstanding)}`);

  heading("HEALTH");
  const svc = await getServiceHealth();
  console.log(
    `  services: ${svc.activeServices}/${svc.totalServices} active (updated ${svc.lastUpdated})`,
  );
  const auto = await getAutomationHealth();
  console.log(
    `  automations: green=${auto.green} yellow=${auto.yellow} red=${auto.red} unknown=${auto.unknown} (total=${auto.total})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
