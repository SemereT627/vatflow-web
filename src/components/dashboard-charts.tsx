"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { compactNumber, type Bar, type ProductShare } from "@/lib/dashboard";
import { formatMoney, formatNumber } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** ▲ +8.0% / ▼ -4.0% chip: lime when good, red when bad, grey when neither. */
export function ChangePill({
  text,
  direction,
  tone,
  title,
}: {
  text: string;
  direction?: "up" | "down";
  tone: "good" | "bad" | "warn" | "flat";
  title?: string;
}) {
  const tones = {
    good: "bg-good-bg text-good",
    bad: "bg-critical-bg text-critical",
    warn: "bg-warn-bg text-warn",
    flat: "bg-surface-2 text-ink-soft",
  };
  return (
    <span
      title={title}
      className={`inline-flex h-[22px] flex-none items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold tabular-nums ${tones[tone]}`}
    >
      {direction && (
        <svg viewBox="0 0 10 10" className={`size-2 fill-current ${direction === "down" ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 1.5 9 8.5H1z" />
        </svg>
      )}
      {text}
    </span>
  );
}

const signedPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1).replace(/\.0$/, "")}%`;

/** Step for 4 gridlines that clears `max`: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ. */
function niceStep(max: number): number {
  if (max <= 0) return 1;
  const raw = max / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => f <= n) ?? 10) * exp;
}

export type BarView = {
  key: string;
  label: string;
  bars: Bar[];
  total: number;
  change: number | null;
  /** What `change` compares against, e.g. "previous 12 months". */
  against: string;
};

/**
 * Hatched bars with a lime cap; the selected bar turns solid lime with its
 * value inside and its change on the previous bar above. Hover, focus or tap
 * selects; leaving the plot returns to the latest bar.
 */
export function SalesBars({ views, initial }: { views: BarView[]; initial: string }) {
  const [viewKey, setViewKey] = useState(initial);
  const view = views.find((v) => v.key === viewKey) ?? views[0];
  const last = view.bars.length - 1;
  const [selected, setSelected] = useState(last);
  const sel = Math.min(selected, last);

  const step = niceStep(Math.max(...view.bars.map((b) => b.value)));
  const top = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[22px] font-semibold tracking-tight tabular-nums" title={`${formatMoney(view.total)} ETB`}>
            <span className="mr-1.5 text-sm font-medium text-ink-soft">ETB</span>
            {formatNumber(Math.round(view.total))}
          </span>
          {view.change !== null && (
            <ChangePill
              text={signedPct(view.change)}
              direction={view.change >= 0 ? "up" : "down"}
              tone={view.change >= 0 ? "good" : "bad"}
              title={`vs ${view.against}`}
            />
          )}
        </div>
        <div role="tablist" aria-label="Group sales by" className="flex rounded-lg border border-line bg-background/40 p-1">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={v.key === view.key}
              onClick={() => {
                setViewKey(v.key);
                setSelected(v.bars.length - 1);
              }}
              className={`h-7 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                v.key === view.key ? "bg-brand font-semibold text-brand-ink" : "text-ink-soft hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-48 flex-1 flex-col" onMouseLeave={() => setSelected(last)}>
        <div className="flex min-h-0 flex-1 pt-9">
          <div className="relative w-11 flex-none" aria-hidden="true">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-3 translate-y-1/2 text-[11px] text-ink-faint tabular-nums"
                style={{ bottom: `${(t / top) * 100}%` }}
              >
                {compactNumber(t)}
              </span>
            ))}
          </div>
          <div className="flex flex-1 items-end gap-2">
            {view.bars.map((b, i) => {
              const on = i === sel;
              const pct = (b.value / top) * 100;
              const prev = view.bars[i - 1]?.value;
              const change = prev ? ((b.value - prev) / prev) * 100 : null;
              return (
                <div key={b.title} className="flex h-full min-w-0 flex-1 items-end justify-center">
                  {b.value > 0 && (
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${b.title}: ${formatMoney(b.value)} ETB before VAT, ${b.receipts} receipts`}
                      onMouseEnter={() => setSelected(i)}
                      onFocus={() => setSelected(i)}
                      onClick={() => setSelected(i)}
                      className={`relative w-full max-w-12 rounded-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        on
                          ? "bg-brand shadow-[0_0_28px_-6px_rgb(156_234_54/0.55)]"
                          : "bg-hatch bg-[#1c1c1b] text-white/[0.05] hover:bg-[#222221]"
                      }`}
                      style={{ height: `${pct}%`, minHeight: 14 }}
                    >
                      <span
                        className={`absolute top-1.5 left-1/2 h-[3px] w-2/5 -translate-x-1/2 rounded-full ${on ? "bg-black/80" : "bg-brand"}`}
                      />
                      {on && (
                        <>
                          <span className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-brand-ink">
                            {change !== null ? (
                              <span className="flex items-center gap-1">
                                <svg viewBox="0 0 10 10" className={`size-2 fill-current ${change < 0 ? "rotate-180" : ""}`} aria-hidden="true">
                                  <path d="M5 1.5 9 8.5H1z" />
                                </svg>
                                {signedPct(change)}
                              </span>
                            ) : (
                              `${b.receipts} receipts`
                            )}
                          </span>
                          {pct > 22 && (
                            <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold text-brand-ink">
                              {compactNumber(b.value)}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-2.5 pl-11" aria-hidden="true">
          {view.bars.map((b, i) => (
            <span
              key={b.title}
              className={`min-w-0 flex-1 truncate text-center text-xs ${i === sel ? "font-semibold text-foreground" : "text-ink-faint"}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const SERIES = ["var(--color-s1)", "var(--color-s2)", "var(--color-s3)", "var(--color-s4)", "var(--color-s5)", "var(--color-s6)"];

/** Segmented donut of product shares; the pill names the hovered (or largest) slice. */
export function ProductDonut({ shares, total }: { shares: ProductShare[]; total: number }) {
  const [active, setActive] = useState(0);
  const r = 54;
  const C = 2 * Math.PI * r;
  const gap = shares.length > 1 ? 4 : 0;
  const lens = shares.map((s) => (s.value / (total || 1)) * C);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const current = shares[active] ?? shares[0];

  return (
    <div className="flex min-h-0 items-center gap-4">
      <div className="relative flex aspect-square w-[46%] max-w-48 min-w-36 flex-none flex-col items-center justify-end rounded-xl border border-line bg-background/40 p-3 pt-10">
        {current && (
          <span className="absolute top-2.5 left-1/2 flex max-w-[92%] -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-brand-ink">
            <span className="size-1.5 flex-none rounded-full bg-brand-ink" />
            {compactNumber(current.value)} ({pct(current.value)}%)
          </span>
        )}
        <svg viewBox="0 0 140 140" className="w-full" role="img" aria-label="Share of sales before VAT by product">
          {shares.map((s, i) => {
            return (
              <circle
                key={s.name}
                cx={70}
                cy={70}
                r={r}
                fill="none"
                stroke={SERIES[i]}
                strokeWidth={i === active ? 20 : 16}
                strokeDasharray={`${Math.max(lens[i] - gap, 0.5)} ${C}`}
                strokeDashoffset={-starts[i]}
                transform="rotate(-90 70 70)"
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={() => setActive(i)}
              />
            );
          })}
          <text x={70} y={68} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
            {compactNumber(total)}
          </text>
          <text x={70} y={84} textAnchor="middle" className="fill-ink-faint text-[10px]">
            ETB total
          </text>
        </svg>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {shares.map((s, i) => (
          <li key={s.name}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              title={`${s.name}: ${formatMoney(s.value)} ETB (${pct(s.value)}%)`}
              className={`flex w-full min-w-0 items-center gap-2 text-left text-[13px] outline-none focus-visible:text-foreground ${
                i === active ? "text-foreground" : "text-ink-soft"
              }`}
            >
              <span className="size-2 flex-none rounded-full" style={{ background: SERIES[i] }} />
              <span className="truncate">{s.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Month picker + lime download button for the Ministry XLSX. */
export function ExportPicker({ months }: { months: { key: string; title: string }[] }) {
  const [key, setKey] = useState(months[months.length - 1]?.key ?? "");
  const [year, month] = key.split("-");

  return (
    <div className="flex gap-2.5">
      <Select value={key} onValueChange={setKey}>
        <SelectTrigger aria-label="Ethiopian month to export" className="h-11 flex-1 rounded-xl bg-background/40 px-4 text-ink-soft">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...months].reverse().map((m) => (
            <SelectItem key={m.key} value={m.key}>
              {m.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <a
        href={`/api/exports/monthly?year=${year}&month=${month}`}
        aria-label="Download the monthly journal (XLSX)"
        title="Download XLSX"
        className="flex size-11 flex-none items-center justify-center rounded-xl bg-brand text-brand-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Download className="size-4" />
      </a>
    </div>
  );
}
