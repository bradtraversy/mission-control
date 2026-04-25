"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";

export function PauseToggle({ paused }: { paused: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    startTransition(async () => {
      const res = await fetch("/api/control", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
          error?: string;
        };
        alert(`Failed to update pause: ${error ?? "unknown error"}`);
        return;
      }
      router.refresh();
    });
  };

  const Icon = paused ? Play : Pause;
  const label = paused ? "Resume" : "Pause";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={paused}
      title={paused ? "Agents paused — click to resume" : "Click to pause agents"}
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm transition-colors disabled:cursor-wait ${
        paused
          ? "bg-amber-400/15 text-amber-200 hover:bg-amber-400/20"
          : "text-muted hover:text-foreground hover:bg-surface"
      }`}
    >
      <Icon size={13} strokeWidth={1.75} />
      {label}
    </button>
  );
}
