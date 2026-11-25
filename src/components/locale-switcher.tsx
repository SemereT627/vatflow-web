"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ", soon: true },
];

export function LocaleSwitcher() {
  const [locale, setLocale] = useState("en");
  const [notice, setNotice] = useState(false);

  function handleChange(next: string) {
    const target = LOCALES.find((l) => l.value === next);
    if (target?.soon) {
      setNotice(true);
      window.setTimeout(() => setNotice(false), 2500);
      return;
    }
    setLocale(next);
  }

  return (
    <div className="relative">
      <Select value={locale} onValueChange={handleChange}>
        <SelectTrigger
          aria-label="Language"
          title="Language"
          className="size-10 justify-center rounded-xl bg-surface p-0 text-ink-soft hover:bg-surface-2 hover:text-foreground [&>svg:last-child]:hidden"
        >
          <Globe className="size-4" />
          <span className="sr-only">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {LOCALES.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
              {l.soon && <span className="ml-1.5 text-ink-faint">(soon)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {notice && (
        <div className="absolute right-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft shadow-lg">
          Amharic isn&apos;t wired up yet — coming soon.
        </div>
      )}
    </div>
  );
}
