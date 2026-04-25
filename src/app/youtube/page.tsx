import { Card, CardBody } from "@/components/ui/Card";
import { buildObsidianUri, getYoutubeRecent, getYoutubeVideos } from "@/lib";
import type { YoutubeRecentUpload, YoutubeVideo } from "@/lib/types";

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
  const [videos, recent] = await Promise.all([
    getYoutubeVideos(),
    getYoutubeRecent(),
  ]);
  const sorted = videos.slice().sort((a, b) => {
    const aT = a.targetPublish ? Date.parse(a.targetPublish) : Number.POSITIVE_INFINITY;
    const bT = b.targetPublish ? Date.parse(b.targetPublish) : Number.POSITIVE_INFINITY;
    return aT - bT;
  });

  return (
    <div className="p-6 space-y-6">
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

      <section className="space-y-2 pt-2">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium tracking-[0.15em] uppercase text-muted">
            Recent uploads
          </h2>
          <span className="text-[10px] text-muted/60">
            {recent.count} of last {recent.count}
            {recent.generatedAt && (
              <> · synced {formatSyncedRelative(recent.generatedAt)}</>
            )}
          </span>
        </header>
        {recent.videos.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-[12px] text-muted/60 italic">
                No data yet — first run of <code>youtube-recent</code> hasn&apos;t
                landed. Wait ~1 min and refresh.
              </p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="!p-0">
              <ul className="divide-y divide-border/40">
                {recent.videos.map((v) => (
                  <RecentRow key={v.videoId} video={v} />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}

function formatSyncedRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const ageMin = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (ageMin < 1) return "just now";
  if (ageMin < 60) return `${ageMin} min ago`;
  const h = Math.round(ageMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(s: number | null): string {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatPublished(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RecentRow({ video }: { video: YoutubeRecentUpload }) {
  return (
    <li>
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-stretch gap-3 px-3 py-3 hover:bg-surface-2/40 transition-colors"
      >
        {video.thumbnailUrl && (
          // YouTube CDN URL — no vault storage, just lazy-load.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="w-[120px] h-[68px] rounded object-cover bg-surface-2 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="text-sm text-foreground leading-snug line-clamp-2">
            {video.title}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted/80">
            <span>{formatPublished(video.publishedAt)}</span>
            {video.durationSeconds != null && (
              <>
                <span className="text-muted/40">·</span>
                <span className="font-mono">{formatDuration(video.durationSeconds)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-center shrink-0 min-w-[110px] text-right">
          <div
            className="text-base font-semibold text-accent font-mono leading-none"
            title={`${video.viewCount ?? 0} views`}
          >
            {formatCount(video.viewCount)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted/60 mt-0.5">
            views
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted/80 font-mono mt-2">
            <span title={`${video.likeCount ?? 0} likes`}>
              {formatCount(video.likeCount)} likes
            </span>
            <span className="text-muted/40">·</span>
            <span title={`${video.commentCount ?? 0} comments`}>
              {formatCount(video.commentCount)} comments
            </span>
          </div>
        </div>
      </a>
    </li>
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
