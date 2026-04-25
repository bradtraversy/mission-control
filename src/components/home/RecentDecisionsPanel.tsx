import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { stripMarkdownBold } from "@/lib/markdown";

type Props = {
  items: string[];
};

export function RecentDecisionsPanel({ items }: Props) {
  return (
    <Card>
      <CardHeader title="Recent Decisions" meta={`${items.length} shown`} />
      <CardBody className="space-y-2.5">
        {items.length === 0 ? (
          <p className="text-base text-muted">No recent decisions logged.</p>
        ) : (
          items.map((item, i) => {
            const clean = stripMarkdownBold(item);
            const dateMatch = clean.match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]+)$/);
            const date = dateMatch?.[1] ?? null;
            const text = dateMatch?.[2] ?? clean;
            return (
              <div key={`${i}-${date ?? "x"}`} className="space-y-0.5">
                {date && (
                  <span className="text-[12px] text-muted font-mono">
                    {date}
                  </span>
                )}
                <p className="text-base text-foreground line-clamp-3">{text}</p>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}
