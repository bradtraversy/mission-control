import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

// MC reads the Obsidian vault on every request via fs.readFile, so static
// prerendering would freeze the UI to build-time state. Force every route
// dynamic so router.refresh() (driven by chokidar+SSE) actually re-reads
// the vault.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mission Control",
  description:
    "Brad's command center — reads the Obsidian vault, surfaces tasks, projects, sessions, agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
