import { TabStub } from "@/components/layout/TabStub";

export default function Page() {
  return (
    <TabStub
      title="Tasks"
      description="Short-term quick queue over Tasks/*.md. Kanban: Queued → Claimed → Done, filter by agent. Done tasks auto-archive after 7 days. Travis's heartbeat pulls from here."
    />
  );
}
