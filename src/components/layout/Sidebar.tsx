"use client";

import {
  Bot,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Folders,
  GitBranch,
  History,
  Home,
  ListChecks,
  ListTodo,
  Network,
  PlaySquare,
  Settings,
  Telescope,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { NavLink } from "./NavLink";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: Folders },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/research", label: "Research", icon: Telescope },
  { href: "/youtube", label: "YouTube", icon: PlaySquare },
  { href: "/sponsors", label: "Sponsors", icon: DollarSign },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/network", label: "Network", icon: Network },
  { href: "/github", label: "GitHub", icon: GitBranch },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const STORAGE_KEY = "mc:left-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("mc:left-collapsed-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("mc:left-collapsed-change", cb);
  };
}

export function Sidebar() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  function toggle() {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
      window.dispatchEvent(new Event("mc:left-collapsed-change"));
    } catch {
      // ignore
    }
  }

  return (
    <aside
      className="shrink-0 border-r border-border h-full"
      style={{ width: collapsed ? 56 : 224 }}
    >
      <nav className="h-full flex flex-col gap-0.5 p-3 overflow-y-auto overflow-x-hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.href}
              href={tab.href}
              label={tab.label}
              collapsed={collapsed}
              icon={<Icon size={16} strokeWidth={1.75} />}
            />
          );
        })}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-auto flex items-center justify-center h-8 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          {collapsed ? (
            <ChevronsRight size={16} strokeWidth={1.75} />
          ) : (
            <ChevronsLeft size={16} strokeWidth={1.75} />
          )}
        </button>
      </nav>
    </aside>
  );
}
