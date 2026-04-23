"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const CLIENT_DEBOUNCE_MS = 200;

export function LiveUpdater() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events");

    const scheduleRefresh = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        router.refresh();
      }, CLIENT_DEBOUNCE_MS);
    };

    source.addEventListener("change", scheduleRefresh);

    return () => {
      source.removeEventListener("change", scheduleRefresh);
      source.close();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [router]);

  return null;
}
