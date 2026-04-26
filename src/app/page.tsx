import { fetchHomeData } from "@/components/home/data";
import { DigestPreviewPanel } from "@/components/home/DigestPreviewPanel";
import { RecentDecisionsPanel } from "@/components/home/RecentDecisionsPanel";
import { RecentSessionsPanel } from "@/components/home/RecentSessionsPanel";
import { SponsorDeadlinesPanel } from "@/components/home/SponsorDeadlinesPanel";
import { StatTiles } from "@/components/home/StatTiles";
import { TasksPanel } from "@/components/home/TasksPanel";
import { ThisWeekPanel } from "@/components/home/ThisWeekPanel";
import { TodosNowPanel } from "@/components/home/TodosNowPanel";

export default async function Page() {
  const data = await fetchHomeData();
  return (
    <div className="p-6 space-y-4 max-w-screen-2xl mx-auto">
      <StatTiles {...data.stats} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ThisWeekPanel items={data.thisWeek} />
        </div>
        <SponsorDeadlinesPanel brands={data.sponsorBrands} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TodosNowPanel todos={data.todosNow} />
        <TasksPanel tasks={data.activeTasks} />
        <RecentSessionsPanel sessions={data.recentSessions} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentDecisionsPanel items={data.recentDecisions} />
        <DigestPreviewPanel digest={data.latestDigest} />
      </section>
    </div>
  );
}
