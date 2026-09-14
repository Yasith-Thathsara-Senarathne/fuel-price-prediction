"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

export function NavLink({ href, children }: { href: Route; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`relative py-1 text-sm transition-colors ${
        active ? "text-foreground font-medium" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] rounded-full bg-accent" />
      )}
    </Link>
  );
}
