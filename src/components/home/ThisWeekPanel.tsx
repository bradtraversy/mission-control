import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { stripMarkdownBold } from "@/lib/markdown";
import type { ThisWeekFocusItem } from "@/lib/types";

type Props = {
  items: ThisWeekFocusItem[];
  className?: string;
};

type RenderedItem = ThisWeekFocusItem & { displayIndex: number };

function groupInOrder(items: ThisWeekFocusItem[]): {
  label: string | null;
  items: RenderedItem[];
}[] {
  const groups: { label: string | null; items: RenderedItem[] }[] = [];
  items.forEach((item, idx) => {
    const last = groups[groups.length - 1];
    const rendered: RenderedItem = { ...item, displayIndex: idx + 1 };
    if (last && last.label === item.group) {
      last.items.push(rendered);
    } else {
      groups.push({ label: item.group, items: [rendered] });
    }
  });
  return groups;
}

function FocusRow({ item }: { item: RenderedItem }) {
  const clean = stripMarkdownBold(item.text);
  const [first, ...rest] = clean.split(" — ");
  const description = rest.join(" — ");
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-muted/60 mt-0.5 tabular-nums">
        {item.displayIndex}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-foreground">{first}</h3>
        {description && (
          <p className="text-sm text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export function ThisWeekPanel({ items, className }: Props) {
  const hasGroups = items.some((i) => i.group !== null);

  return (
    <Card className={className}>
      <CardHeader title="This Week's Focus" meta={`top ${items.length}`} />
      <CardBody className="space-y-3">
        {items.length === 0 ? (
          <p className="text-base text-muted">
            No priorities set. Update{" "}
            <code className="text-sm">Core/Context/Current State.md</code>.
          </p>
        ) : !hasGroups ? (
          items.map((item, i) => (
            <FocusRow
              key={`${i}-${item.text}`}
              item={{ ...item, displayIndex: i + 1 }}
            />
          ))
        ) : (
          groupInOrder(items).map((group, gi) => (
            <div key={`g-${gi}-${group.label ?? "null"}`} className="space-y-2">
              {group.label && (
                <div className="text-xs font-semibold uppercase tracking-wide text-muted/70">
                  {group.label}
                </div>
              )}
              <div className="space-y-3">
                {group.items.map((item) => (
                  <FocusRow key={`${item.displayIndex}-${item.text}`} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
