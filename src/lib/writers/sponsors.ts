import fs from "node:fs/promises";
import path from "node:path";
import { listMarkdown } from "../vault";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

async function writeFileAtomic(absolute: string, contents: string): Promise<void> {
  const dir = path.dirname(absolute);
  const tmp = path.join(dir, `.${path.basename(absolute)}.tmp-${process.pid}`);
  await fs.writeFile(tmp, contents, "utf-8");
  await fs.rename(tmp, absolute);
}

function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveSponsorFile(slug: string): Promise<string> {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`invalid sponsor slug: ${slug}`);
  }
  const files = await listMarkdown("Business/Sponsors", {
    filter: (rel) => {
      const base = rel.split("/").pop() ?? "";
      return base !== "README.md" && base !== "Email Log.md";
    },
  });
  for (const file of files) {
    const fm = file.frontmatter as Record<string, unknown>;
    const name =
      typeof fm.name === "string" && fm.name.trim()
        ? fm.name.trim()
        : (file.relativePath.split("/").pop() ?? "").replace(/\.md$/, "");
    if (brandSlug(name) === slug) return file.path;
  }
  throw new Error(`sponsor not found: ${slug}`);
}

type PaymentVerifyInput = {
  date?: string;
  method?: string;
  notes?: string;
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").trim();
}

// Walks the Payment log table and verifies the Nth payment row (skipping the
// header + separator rows). Replaces the Verified cell with ✅ and overrides
// the Date / Method / Notes cells when the corresponding input fields are set.
function patchPaymentRow(
  raw: string,
  rowIndex: number,
  input: PaymentVerifyInput,
): string {
  const lines = raw.split(/\r?\n/);
  const headingIdx = lines.findIndex((l) => /^##\s+Payment log\s*$/.test(l));
  if (headingIdx < 0) {
    throw new Error("Payment log section not found");
  }

  let dataRowsSeen = 0;
  let foundIdx = -1;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|[\s\-|]+\|$/.test(trimmed)) continue;
    if (/^\|\s*Date\s*\|/i.test(trimmed)) continue;
    if (dataRowsSeen === rowIndex) {
      foundIdx = i;
      break;
    }
    dataRowsSeen++;
  }
  if (foundIdx < 0) {
    throw new Error(`payment row ${rowIndex} not found`);
  }

  const cells = lines[foundIdx]
    .split("|")
    .map((c) => c.trim())
    .slice(1, -1);
  // Pad to 6 cells (Date | Amount | Deal | Method | Verified | Notes) so files
  // with shorter rows still update cleanly.
  while (cells.length < 6) cells.push("");

  if (input.date && input.date.trim()) cells[0] = escapeCell(input.date);
  if (input.method && input.method.trim()) cells[3] = escapeCell(input.method);
  cells[4] = "✅";
  if (input.notes !== undefined) {
    cells[5] = input.notes.trim() ? escapeCell(input.notes) : cells[5];
  }

  lines[foundIdx] = `| ${cells.join(" | ")} |`;
  return lines.join("\n");
}

export async function verifySponsorPayment(
  slug: string,
  rowIndex: number,
  input: PaymentVerifyInput,
): Promise<void> {
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    throw new Error(`invalid rowIndex: ${rowIndex}`);
  }
  const absolute = await resolveSponsorFile(slug);
  const raw = await fs.readFile(absolute, "utf-8");
  const updated = patchPaymentRow(raw, rowIndex, input);
  if (updated === raw) {
    throw new Error("verify produced no change (already verified?)");
  }
  await writeFileAtomic(absolute, updated);
}

// Re-exported helper so the API route can stay tiny.
export function isSafeSponsorSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export const _internal = { resolveSponsorFile, brandSlug, patchPaymentRow };
