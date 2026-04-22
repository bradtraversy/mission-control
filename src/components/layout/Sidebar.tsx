import {
  BookOpen,
  Bot,
  Brain,
  Calendar,
  FileText,
  Folders,
  History,
  Home,
  Inbox,
  ListChecks,
  ListTodo,
  Network,
  PlaySquare,
  Settings,
  Telescope,
} from "lucide-react";
import { NavLink } from "./NavLink";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: Folders },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/research", label: "Research", icon: Telescope },
  { href: "/youtube", label: "YouTube", icon: PlaySquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/network", label: "Network", icon: Network },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  return (
    <nav className="h-full flex flex-col gap-0.5 p-3 overflow-y-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.href}
            href={tab.href}
            label={tab.label}
            icon={<Icon size={16} strokeWidth={1.75} />}
          />
        );
      })}
    </nav>
  );
}
