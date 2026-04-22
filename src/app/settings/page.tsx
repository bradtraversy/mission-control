import { TabStub } from "@/components/layout/TabStub";

export default function Page() {
  return (
    <TabStub
      title="Settings"
      description="Vault path, port, visible tabs, feature flags. MC's own config — stored local to this app, not in the vault."
    />
  );
}
