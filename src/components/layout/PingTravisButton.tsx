"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export function PingTravisButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const ping = () => {
    const title = window.prompt("What should Travis do?");
    if (!title?.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, agent: "travis" }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
          error?: string;
        };
        alert(`Failed to ping Travis: ${error ?? "unknown error"}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={ping}
      disabled={isPending}
      className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm text-muted hover:text-foreground hover:bg-surface transition-colors disabled:cursor-wait"
    >
      <Zap size={13} strokeWidth={1.75} />
      Ping Travis
    </button>
  );
}
