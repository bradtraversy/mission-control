import { Card, CardBody } from "@/components/ui/Card";
import { buildObsidianUri, getYoutubeVideos } from "@/lib";
import type { YoutubeVideo } from "@/lib/types";

const STATUS_STYLE: Record<YoutubeVideo["statusTone"], string> = {
  "in-progress": "bg-accent/15 text-accent",
  paused: "bg-amber-400/15 text-amber-300",
  published: "bg-emerald-400/15 text-emerald-300",
};

const STATUS_LABEL: Record<YoutubeVideo["statusTone"], string> = {
  "in-progress": "In progress",
  paused: "Paused",
  published: "Published",
};

function formatTargetDate(target: string | null): {
  text: string;
  urgency: "soon" | "near" | "far" | null;
} {
  if (!target) return { text: "—", urgency: null };
  const date = new Date(target);
  if (Number.isNaN(date.getTime())) return { text: target, urgency: null };
  const now = new Date();
  const days = Math.round(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  let urgency: "soon" | "near" | "far";
  if (days <= 7) urgency = "soon";
  else if (days <= 21) urgency = "near";
  else urgency = "far";
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (days < 0) return { text: `${formatted} (${-days}d overdue)`, urgency: "soon" };
  if (days === 0) return { text: `${formatted} (today)`, urgency: "soon" };
  return { text: `${formatted} (${days}d)`, urgency };
}

function urgencyClass(urgency: ReturnType<typeof formatTargetDate>["urgency"]): string {
  if (urgency === "soon") return "text-rose-300";
  if (urgency === "near") return "text-amber-300";
  return "text-muted";
}

export default async function Page() {
  const videos = await getYoutubeVideos();
  const sorted = videos.slice().sort((a, b) => {
    const aT = a.targetPublish ? Date.parse(a.targetPublish) : Number.POSITIVE_INFINITY;
    const bT = b.targetPublish ? Date.parse(b.targetPublish) : Number.POSITIVE_INFINITY;
    return aT - bT;
  });

  return (
    <div className="p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-lg font-medium tracking-tight">YouTube</h1>
        <p className="text-[12px] text-muted">
          Active videos with phase progress · {sorted.length}{" "}
          {sorted.length === 1 ? "video" : "videos"} in flight · published moves to{" "}
          <code className="text-foreground/80">YouTube/Archive/</code>
        </p>
      </header>
      {sorted.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-[12px] text-muted/60 italic">
              Nothing in flight. Drop a folder under <code>YouTube/</code> with a{" "}
              <code>Progress.md</code> to see it here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((v) => (
            <VideoCard key={v.folderName} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: YoutubeVideo }) {
  const { text: dateText, urgency } = formatTargetDate(video.targetPublish);
  const pct =
    video.totalPhases === 0
      ? 0
      : Math.round((video.completedPhases / video.totalPhases) * 100);
  const obsidianUri = buildObsidianUri(`YouTube/${video.folderName}/Progress.md`);
  return (
    <Card>
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground leading-snug min-w-0">
            {video.title}
          </h2>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${STATUS_STYLE[video.statusTone]}`}
          >
            {STATUS_LABEL[video.statusTone]}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {video.sponsor && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-300 font-mono">
              {video.sponsor.name}
              {video.sponsor.totalUsd != null && (
                <span className="opacity-70">
                  {" "}
                  · ${(video.sponsor.totalUsd / 1000).toFixed(0)}K
                  {video.sponsor.paidUsd != null && (
                    <> (${(video.sponsor.paidUsd / 1000).toFixed(0)}K paid)</>
                  )}
                </span>
              )}
            </span>
          )}
          {video.targetPublish && (
            <span className={urgencyClass(urgency)}>target: {dateText}</span>
          )}
          <a
            href={obsidianUri}
            className="text-muted hover:text-foreground ml-auto text-[10px]"
          >
            Open ↗
          </a>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted">
              Progress · {video.completedPhases} of {video.totalPhases}
            </span>
            <span className="text-foreground/80 font-mono">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap pt-1">
            {video.phases.map((p) => (
              <span
                key={p.label}
                title={p.label}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  p.done
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-surface-2 text-muted/60"
                }`}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
