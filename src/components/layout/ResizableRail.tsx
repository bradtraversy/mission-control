"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "mc:rail-width";
const COLLAPSED_KEY = "mc:rail-collapsed";
const MIN_WIDTH = 240;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;
const COLLAPSED_WIDTH = 16;

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

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("mc:rail-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("mc:rail-change", cb);
  };
}

export function ResizableRail({ children }: { children: React.ReactNode }) {
  const storedWidth = useSyncExternalStore(
    subscribe,
    readStoredWidth,
    () => DEFAULT_WIDTH
  );
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const widthRef = useRef(storedWidth);

  const expandedWidth = dragWidth ?? storedWidth;
  const width = collapsed ? COLLAPSED_WIDTH : expandedWidth;

  useEffect(() => {
    widthRef.current = expandedWidth;
  }, [expandedWidth]);

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
        window.dispatchEvent(new Event("mc:rail-change"));
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
    if (collapsed) return;
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onDoubleClick() {
    if (collapsed) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
      window.dispatchEvent(new Event("mc:rail-change"));
    } catch {
      // ignore
    }
  }

  function toggleCollapsed() {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
      window.dispatchEvent(new Event("mc:rail-change"));
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
        title={
          collapsed
            ? "Expand activity rail"
            : "Drag to resize · double-click to reset"
        }
        className={`absolute left-0 top-0 h-full z-10 transition-colors ${
          collapsed
            ? "w-4 hover:bg-surface-2"
            : "w-1 -translate-x-1/2 cursor-col-resize hover:bg-accent/40 active:bg-accent/60"
        }`}
      />
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand activity rail" : "Collapse activity rail"}
        className="absolute left-0 top-3 z-20 flex items-center justify-center h-6 w-6 -translate-x-1/2 rounded-full bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        {collapsed ? (
          <ChevronsLeft size={12} strokeWidth={2} />
        ) : (
          <ChevronsRight size={12} strokeWidth={2} />
        )}
      </button>
      {!collapsed && <div className="flex-1 min-w-0">{children}</div>}
    </aside>
  );
}
