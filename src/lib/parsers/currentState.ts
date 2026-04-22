import { readMarkdown } from "../vault";
import { bulletLines, sectionBody } from "../markdown";
import type { CurrentStateSnapshot } from "../types";

export async function getCurrentState(): Promise<CurrentStateSnapshot> {
  const file = await readMarkdown("Core/Context/Current State.md");
  const body = file.body;
  const thisWeek = bulletLines(sectionBody(body, "This Week's Focus")).slice(
    0,
    3,
  );
  const immediateActions = bulletLines(
    sectionBody(body, "Immediate Next Actions"),
  );
  const recentDecisions = bulletLines(
    sectionBody(body, "Recent Decisions / Changes"),
  );
  const sponsorsRaw = sectionBody(body, "Active Sponsor Deadlines") ?? "";
  const openQuestions = bulletLines(sectionBody(body, "Open Questions"));
  return {
    thisWeek,
    immediateActions,
    openQuestions,
    sponsorsRaw,
    recentDecisions,
    raw: body,
  };
}
