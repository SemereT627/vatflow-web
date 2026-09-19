"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLinks({ links }: { links: { href: string; label: string; icon: ReactNode }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 items-center gap-1 overflow-x-auto md:flex-col md:items-stretch md:gap-0.5 md:overflow-visible">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
              active ? "bg-brand text-brand-ink" : "text-ink-soft hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <span className="h-[17px] w-[17px] flex-none [&>svg]:h-full [&>svg]:w-full">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
