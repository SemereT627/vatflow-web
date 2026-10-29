"use client";

import { useEffect, useRef, useState } from "react";
import type { DayTotal, ProductTotal } from "@/lib/dashboard";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { formatMoney } from "@/lib/utils";

/**
 * Measures the wrapper's real pixel size so the SVG viewBox can match it
 * exactly (1:1), instead of a fixed aspect ratio that either leaves blank
 * space or stretches text/lines unevenly when the card is taller/shorter
 * than that ratio (e.g. a tall external monitor vs. a laptop screen).
 */
function useElementSize(fallbackWidth: number, fallbackHeight: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: fallbackWidth,
    height: fallbackHeight,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize({
        width: el.clientWidth || fallbackWidth,
        height: el.clientHeight || fallbackHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallbackWidth, fallbackHeight]);

  return { ref, ...size };
}

export function Sparkline({
  values,
  className = "mt-2 h-6 w-full",
}: {
  values: number[];
  className?: string;
}) {
  const W = 120;
  const H = 26;
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Sales before VAT (area + line) and the VAT on them (dotted line) per day.
 * Hovering anywhere over the plot snaps a crosshair to the nearest day and
 * shows its exact figures.
 */
export function TrendChart({ days }: { days: DayTotal[] }) {
  const { ref, width: W, height: H } = useElementSize(640, 160);
  const [hover, setHover] = useState<number | null>(null);
  const padL = 40;
  const padR = 12;
  const padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padB - 8;
  const max = Math.max(...days.map((d) => d.net), 1) * 1.15;

  const xAt = (i: number) => padL + (i / Math.max(days.length - 1, 1)) * innerW;
  const yAt = (v: number) => 8 + innerH - (v / max) * innerH;

  const netPts = days.map((d, i) => `${xAt(i)},${yAt(d.net)}`).join(" ");
  const vatPts = days.map((d, i) => `${xAt(i)},${yAt(d.vat)}`).join(" ");
  const areaPath = `M${padL},${8 + innerH} L${netPts} L${xAt(days.length - 1)},${8 + innerH} Z`;

  const step = days.length > 10 ? Math.ceil(days.length / 6) : 1;
  const active = hover !== null ? days[hover] : null;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * innerW;
    const i = Math.round((x / innerW) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  }

  return (
    <div ref={ref} className="relative h-full min-h-40 w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Sales before VAT and VAT collected by day"
        className="block h-full w-full"
      >
        {[0, 1, 2, 3].map((g) => {
          const gy = 8 + (innerH / 3) * g;
          const val = max - (max / 3) * g;
          return (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="var(--color-line)" />
              <text x={padL - 6} y={gy + 3} fontSize={10} fill="var(--color-ink-faint)" textAnchor="end">
                {compact(val)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="var(--color-s1)" fillOpacity={0.12} />
        <polyline
          points={vatPts}
          fill="none"
          stroke="var(--color-s2)"
          strokeWidth={2}
          strokeDasharray="1 5"
          strokeLinecap="round"
        />
        <polyline
          points={netPts}
          fill="none"
          stroke="var(--color-s1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {days.map((d, i) =>
          i % step === 0 || i === days.length - 1 ? (
            <text
              key={d.date}
              x={xAt(i)}
              y={H - 4}
              fontSize={10}
              fill="var(--color-ink-faint)"
              // First/last labels anchor inward so they never clip at the edges.
              textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
            >
              {shortDate(d.date)}
            </text>
          ) : null,
        )}
        {active && hover !== null && (
          <g pointerEvents="none">
            <line x1={xAt(hover)} x2={xAt(hover)} y1={8} y2={8 + innerH} stroke="var(--color-ink-faint)" strokeDasharray="3 3" />
            <circle cx={xAt(hover)} cy={yAt(active.net)} r={4} fill="var(--color-s1)" stroke="var(--color-surface)" strokeWidth={2} />
            <circle cx={xAt(hover)} cy={yAt(active.vat)} r={4} fill="var(--color-s2)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
        {/* Hit area bigger than the marks: the whole plot. */}
        <rect
          x={padL}
          y={0}
          width={innerW}
          height={8 + innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-48 rounded-lg border border-line bg-surface-2 p-2.5 text-xs shadow-lg"
          style={{
            left: `${(xAt(hover) / W) * 100}%`,
            transform: xAt(hover) > W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <div className="font-semibold">{shortDate(active.date)}</div>
          <div className="text-ink-faint">{formatEthiopianDate(active.date)} E.C.</div>
          <div className="mt-1.5 space-y-0.5 tabular-nums">
            <Row color="var(--color-s1)" label="Sales before VAT" value={`${formatMoney(active.net)} ETB`} />
            <Row color="var(--color-s2)" label="VAT" value={`${formatMoney(active.vat)} ETB`} />
            <Row label="Receipts" value={String(active.receipts)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-ink-soft">
        {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/** Ranked products by sales before VAT. One colour — rank isn't an identity. */
export function ProductBars({ products }: { products: ProductTotal[] }) {
  const max = Math.max(...products.map((p) => p.value), 1);
  const total = products.reduce((sum, p) => sum + p.value, 0) || 1;

  return (
    <ul className="space-y-3">
      {products.map((p) => (
        <li key={p.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-semibold" title={p.name}>
              {p.name}
            </span>
            <span className="flex-none text-[12.5px] tabular-nums">
              <span className="font-semibold">{formatMoney(p.value)} ETB</span>
              <span className="ml-1.5 text-ink-faint">{Math.round((p.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--color-s1)]" style={{ width: `${(p.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
