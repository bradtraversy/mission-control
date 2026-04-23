"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    setSpinning(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setSpinning(false), 400);
  }

  const animating = spinning || isPending;

  return (
    <button
      type="button"
      aria-label="Refresh"
      onClick={handleClick}
      className="h-8 w-8 flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
    >
      <RotateCw
        size={13}
        strokeWidth={1.75}
        className={animating ? "animate-spin" : undefined}
      />
    </button>
  );
}
