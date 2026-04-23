import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { Digest } from "@/lib";

type Props = {
  digest: Digest | null;
};

export function DigestPreviewPanel({ digest }: Props) {
  const topics = digest?.frontmatter.topics ?? [];
  const headings = digest
    ? digest.body
        .split(/\r?\n/)
        .filter((l) => /^##\s+/.test(l))
        .map((l) => l.replace(/^##\s+/, "").trim())
        .slice(0, 5)
    : [];

  return (
    <Card>
      <CardHeader
        title="Today's Digest"
        meta={digest?.date ?? "—"}
        action={
          <Link
            href="/research"
            className="text-[11px] text-muted hover:text-foreground"
          >
            Open →
          </Link>
        }
      />
      <CardBody className="space-y-2">
        {!digest ? (
          <p className="text-sm text-muted">No digest yet today.</p>
        ) : (
          <>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {headings.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {headings.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="text-muted/40 mt-0.5">›</span>
                    <span className="text-foreground/90">{h}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">(empty digest body)</p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
