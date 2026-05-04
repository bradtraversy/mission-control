"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "mc:rail-width";
const MIN_WIDTH = 240;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH;
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function ResizableRail({ children }: { children: React.ReactNode }) {
  const storedWidth = useSyncExternalStore(
    subscribe,
    readStoredWidth,
    () => DEFAULT_WIDTH
  );
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const widthRef = useRef(storedWidth);

  const width = dragWidth ?? storedWidth;

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, window.innerWidth - e.clientX)
      );
      setDragWidth(next);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
      } catch {
        // ignore
      }
      setDragWidth(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onDoubleClick() {
    try {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore
    }
  }

  return (
    <aside className="shrink-0 hidden lg:flex relative" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startDrag}
        onDoubleClick={onDoubleClick}
        title="Drag to resize · double-click to reset"
        className="absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize z-10 hover:bg-accent/40 active:bg-accent/60 transition-colors"
      />
      <div className="flex-1 min-w-0">{children}</div>
    </aside>
  );
}
