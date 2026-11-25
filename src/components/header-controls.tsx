"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";
import { RANGE_OPTIONS, parseRange } from "@/lib/dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Receipt search; submits to the Sales list (?q=). "/" focuses it from anywhere. */
export function HeaderSearch() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form action="/sales" role="search" className="relative hidden lg:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input
        ref={ref}
        name="q"
        type="search"
        aria-label="Search receipts"
        placeholder="Search receipts, buyers or TIN"
        className="h-10 w-72 rounded-xl border border-line bg-surface pr-10 pl-10 text-[13px] placeholder:text-ink-faint focus:border-brand/60 focus:outline-none xl:w-80"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md border border-line font-sans text-[11px] text-ink-faint">
        /
      </kbd>
    </form>
  );
}

/** "Last 30 days" picker; only the dashboard has a range. */
export function RangeSelect() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  if (pathname !== "/admin/dashboard") return null;

  return (
    <Select value={String(parseRange(params.get("range")))} onValueChange={(v) => router.push(`/admin/dashboard?range=${v}`)}>
      <SelectTrigger
        aria-label="Date range"
        className="h-10 w-auto gap-2 rounded-xl bg-surface px-3.5 text-[13px] font-medium [&>svg:last-child]:ml-2"
      >
        <CalendarDays className="size-4 text-ink-soft" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {RANGE_OPTIONS.map((d) => (
          <SelectItem key={d} value={String(d)}>
            Last {d} days
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
