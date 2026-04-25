import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { stripMarkdownBold } from "@/lib/markdown";

type Props = {
  items: string[];
  className?: string;
};

export function ThisWeekPanel({ items, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader title="This Week's Focus" meta={`top ${items.length}`} />
      <CardBody className="space-y-3">
        {items.length === 0 ? (
          <p className="text-base text-muted">
            No priorities set. Update <code className="text-sm">Core/Context/Current State.md</code>.
          </p>
        ) : (
          items.map((item, i) => {
            const clean = stripMarkdownBold(item);
            const [first, ...rest] = clean.split(" — ");
            const description = rest.join(" — ");
            return (
              <div key={`${i}-${first}`} className="flex gap-3">
                <span className="text-sm font-medium text-muted/60 mt-0.5 tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-foreground">{first}</h3>
                  {description && (
                    <p className="text-sm text-muted mt-0.5">{description}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}
