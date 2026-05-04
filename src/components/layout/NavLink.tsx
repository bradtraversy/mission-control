"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
};

export function NavLink({ href, label, icon, collapsed }: Props) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 ${
        collapsed ? "justify-center px-0" : "px-3"
      } py-1.5 rounded-md text-base transition-colors ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted hover:text-foreground hover:bg-surface"
      }`}
    >
      <span className="opacity-80 shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
