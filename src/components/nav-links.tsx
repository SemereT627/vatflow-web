"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavLink = { href: string; label: string; icon: ReactNode };
export type NavGroup = { label: string | null; items: NavLink[] };

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-stretch">
      {groups.map((group, i) => (
        <div key={group.label ?? `top-${i}`} className={i > 0 ? "mt-4 border-t border-line pt-4" : ""}>
          {group.label && (
            <div className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
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
                  className={`flex flex-none items-center gap-2.5 rounded-r-lg border-l-2 py-2 pl-2 pr-2.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? "border-brand bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-brand"
                      : "border-transparent text-ink-soft hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <span className="h-[17px] w-[17px] flex-none [&>svg]:h-full [&>svg]:w-full">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
