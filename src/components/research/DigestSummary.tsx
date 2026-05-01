type DigestItem = {
  marker: string;
  title: string;
  url: string | null;
  lead: string;
};

type DigestSection = {
  heading: string;
  items: DigestItem[];
};

type Props = {
  body: string;
};

// Pulls each section heading + its bullet items into structured form so the
// detail page can render a compact "what's in this digest" summary with
// clickable source links — without dumping the full markdown body.
export function DigestSummary({ body }: Props) {
  const sections = parseSections(body);
  if (sections.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Summary
      </h2>
      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.heading} className="space-y-2">
            <h3 className="text-[12px] font-medium tracking-wider uppercase text-foreground/80">
              {section.heading}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <SummaryItem key={i} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryItem({ item }: { item: DigestItem }) {
  const titleEl = item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="text-foreground hover:text-accent transition-colors"
    >
      {item.title}
    </a>
  ) : (
    <span className="text-foreground">{item.title}</span>
  );
  return (
    <li className="text-[13px] leading-snug">
      <div className="flex items-baseline gap-2">
        <span className="text-muted/60 shrink-0">{item.marker}</span>
        <div className="font-medium">{titleEl}</div>
      </div>
      {item.lead && (
        <p className="text-[12px] text-muted leading-snug pl-5 mt-0.5">
          {item.lead}
        </p>
      )}
    </li>
  );
}

function parseSections(body: string): DigestSection[] {
  const lines = body.split(/\r?\n/);
  const sections: DigestSection[] = [];
  let current: DigestSection | null = null;
  // Skip the H1 title and intro lines; only collect H2 sections + their list items.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      current = { heading: h2[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    // Bullet line shaped like:
    //   - 🔴 **[Title](url)** — body text…
    //   - **[Title](url)** — body text…
    //   - **The "frontier coder…" thing.** Body text.
    const bullet = line.match(/^\s*-\s*(.*)$/);
    if (!bullet) continue;
    const rest = bullet[1];
    // Marker: leading emoji if any.
    const markerMatch = rest.match(/^([🔴🟡⚪🆕])/u);
    const marker = markerMatch ? markerMatch[1] : "•";
    const afterMarker = markerMatch ? rest.slice(markerMatch[0].length).trim() : rest;
    // Strong-link form: **[Title](url)**
    const linked = afterMarker.match(
      /^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*(?:[—-]\s*(.*))?$/,
    );
    if (linked) {
      current.items.push({
        marker,
        title: linked[1].trim(),
        url: linked[2].trim(),
        lead: linked[3] ? cleanInline(linked[3]) : "",
      });
      continue;
    }
    // Strong-only form: **Title.** body
    const strong = afterMarker.match(/^\*\*([^*]+?)\*\*\s*(.*)$/);
    if (strong) {
      current.items.push({
        marker,
        title: strong[1].trim(),
        url: null,
        lead: cleanInline(strong[2]),
      });
    }
  }
  return sections.filter((s) => s.items.length > 0);
}

// Strip inline markdown noise that's distracting at preview density.
function cleanInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Replace inline links with their title text — sources link out elsewhere.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
