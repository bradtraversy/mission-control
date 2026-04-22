"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function NavLink({ href, label, icon }: Props) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted hover:text-foreground hover:bg-surface"
      }`}
    >
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
