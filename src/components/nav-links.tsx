"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RailTooltip, railTileClass } from "@/components/rail-tile";

/** badge: count shown on the link, e.g. receipts awaiting review. */
export type NavLink = { href: string; label: string; icon: ReactNode; badge?: number };
/** Mobile menu sections; the desktop rail ignores labels and dividers. */
export type NavGroup = { label: string | null; divider?: boolean; items: NavLink[] };

export function RailLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.badge ? `${link.label} (${link.badge} pending review)` : link.label}
            aria-current={active ? "page" : undefined}
            className={railTileClass(active)}
          >
            {/* Active marker: a short lime bar on the rail's left edge. */}
            {active && <span className="absolute top-1/2 -left-4 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
            {link.icon}
            {!!link.badge && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-black tabular-nums">
                {link.badge}
              </span>
            )}
            <RailTooltip>{link.label}</RailTooltip>
          </Link>
        );
      })}
    </>
  );
}
