"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** badge: count shown at the end of the link, e.g. receipts awaiting review. */
export type NavLink = { href: string; label: string; icon: ReactNode; badge?: number };
export type NavGroup = { label: string | null; items: NavLink[] };

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-stretch">
      {groups.map((group, i) => (
        <div key={group.label ?? `top-${i}`} className={i > 0 ? "mt-4 border-t border-line pt-4" : ""}>
          {group.label && (
            <div className="mb-1 px-2.5 text-xs font-medium text-ink-faint group-data-[collapsed=true]/sidebar:hidden">
              {group.label}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`relative flex h-9 flex-none items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 ${
                    active
                      ? "bg-brand/[0.07] font-semibold text-brand hover:bg-brand/10"
                      : "font-medium text-ink-soft hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {/* Kiln's active marker: a short bar just outside the item. */}
                  {active && (
                    <span className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand/80 group-data-[collapsed=true]/sidebar:hidden" />
                  )}
                  <span className="size-4 flex-none [&>svg]:size-4">{link.icon}</span>
                  <span className="group-data-[collapsed=true]/sidebar:hidden">{link.label}</span>
                  {!!link.badge && (
                    // Collapsed: shrinks to a dot on the icon.
                    <span className="ml-auto rounded-full bg-warn-bg px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-warn group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-1 group-data-[collapsed=true]/sidebar:top-1 group-data-[collapsed=true]/sidebar:h-2 group-data-[collapsed=true]/sidebar:w-2 group-data-[collapsed=true]/sidebar:bg-warn group-data-[collapsed=true]/sidebar:p-0 group-data-[collapsed=true]/sidebar:text-[0px]">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
