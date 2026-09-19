"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { NavGroup } from "@/components/nav-links";

export function MobileNav({
  groups,
  fullName,
  role,
}: {
  groups: NavGroup[];
  fullName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand font-heading text-sm font-bold text-brand-ink">
          VF
        </div>
        <div className="font-heading text-base font-bold leading-none">VatFlow</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface-2 hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent
          className="left-0 top-0 h-full max-h-none w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none rounded-r-xl border-r border-l-0 border-t-0 border-b-0 p-4 duration-300 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
        >
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-2.5 px-1 pt-1">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand font-heading text-sm font-bold text-brand-ink">
                VF
              </div>
              <div>
                <div className="font-heading text-base font-bold leading-none">VatFlow</div>
                <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
              </div>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto">
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
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2.5 rounded-r-lg border-l-2 py-2.5 pl-2 pr-2.5 text-sm font-semibold ${
                            active
                              ? "border-brand bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-brand"
                              : "border-transparent text-ink-soft hover:bg-surface-2 hover:text-foreground"
                          }`}
                        >
                          <span className="h-[18px] w-[18px] flex-none [&>svg]:h-full [&>svg]:w-full">
                            {link.icon}
                          </span>
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-background p-3">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-2 font-heading text-xs font-bold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{fullName}</div>
                <div className="text-[11px] capitalize text-ink-soft">{role}</div>
              </div>
              <SignOutButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
