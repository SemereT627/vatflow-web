"use client";

import { useEffect, useRef, useState } from "react";
import type { DayTotal, ProductTotal } from "@/lib/dashboard";

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

export function TrendChart({ days }: { days: DayTotal[] }) {
  const { ref, width: W, height: H } = useElementSize(640, 160);
  const padL = 36;
  const padB = 18;
  const innerW = W - padL - 8;
  const innerH = H - padB - 8;
  const max = Math.max(...days.map((d) => d.net), 1) * 1.15;

  const xAt = (i: number) => padL + (i / Math.max(days.length - 1, 1)) * innerW;
  const yAt = (v: number) => 8 + innerH - (v / max) * innerH;

  const netPts = days.map((d, i) => `${xAt(i)},${yAt(d.net)}`).join(" ");
  const vatPts = days.map((d, i) => `${xAt(i)},${yAt(d.vat)}`).join(" ");
  const areaPath = `M${padL},${8 + innerH} L${netPts} L${xAt(days.length - 1)},${8 + innerH} Z`;

  const step = days.length > 10 ? Math.ceil(days.length / 6) : 1;

  return (
    <div ref={ref} className="h-full min-h-40 w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Net sales and VAT collected by day"
        className="block h-full w-full"
      >
        {[0, 1, 2, 3].map((g) => {
          const gy = 8 + (innerH / 3) * g;
          const val = max - (max / 3) * g;
          return (
            <g key={g}>
              <line
                x1={padL}
                x2={W - 8}
                y1={gy}
                y2={gy}
                stroke="var(--color-line)"
              />
              <text
                x={0}
                y={gy + 3}
                fontSize={9}
                fill="var(--color-ink-faint)"
                className="font-data"
              >
                {Math.round(val / 1000)}k
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
        <circle
          cx={xAt(days.length - 1)}
          cy={yAt(days[days.length - 1]?.net ?? 0)}
          r={3.5}
          fill="var(--color-s1)"
          stroke="var(--color-surface)"
          strokeWidth={2}
        />
        <circle
          cx={xAt(days.length - 1)}
          cy={yAt(days[days.length - 1]?.vat ?? 0)}
          r={3.5}
          fill="var(--color-s2)"
          stroke="var(--color-surface)"
          strokeWidth={2}
        />
        {days.map((d, i) =>
          i % step === 0 || i === days.length - 1 ? (
            <text
              key={d.date}
              x={xAt(i)}
              y={H - 4}
              fontSize={9}
              fill="var(--color-ink-faint)"
              textAnchor="middle"
              className="font-data"
            >
              {d.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

const BAR_COLORS = [
  "var(--color-s1)",
  "var(--color-s2)",
  "var(--color-s3)",
  "var(--color-s4)",
  "var(--color-s1)",
];

export function ProductBars({ products }: { products: ProductTotal[] }) {
  const max = Math.max(...products.map((p) => p.value), 1);

  return (
    <div role="img" aria-label="Top products by net revenue" className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name}>
          <div className="text-[13px] font-semibold">{p.name}</div>
          <div className="mt-1.5 h-1.75 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(p.value / max) * 100}%`,
                background: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
