import type { DayTotal, ProductTotal } from "@/lib/dashboard";

export function Sparkline({ values }: { values: number[] }) {
  const W = 120;
  const H = 26;
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-6 w-full" aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--color-brand)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendChart({ days }: { days: DayTotal[] }) {
  const W = 640;
  const H = 160;
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
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Net sales and VAT collected by day" className="w-full">
      {[0, 1, 2, 3].map((g) => {
        const gy = 8 + (innerH / 3) * g;
        const val = max - (max / 3) * g;
        return (
          <g key={g}>
            <line x1={padL} x2={W - 8} y1={gy} y2={gy} stroke="var(--color-line)" />
            <text x={0} y={gy + 3} fontSize={9} fill="var(--color-ink-faint)" className="font-data">
              {Math.round(val / 1000)}k
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="var(--color-s1)" fillOpacity={0.12} />
      <polyline points={vatPts} fill="none" stroke="var(--color-s2)" strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />
      <polyline points={netPts} fill="none" stroke="var(--color-s1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xAt(days.length - 1)} cy={yAt(days[days.length - 1]?.net ?? 0)} r={3.5} fill="var(--color-s1)" stroke="var(--color-surface)" strokeWidth={2} />
      <circle cx={xAt(days.length - 1)} cy={yAt(days[days.length - 1]?.vat ?? 0)} r={3.5} fill="var(--color-s2)" stroke="var(--color-surface)" strokeWidth={2} />
      {days.map((d, i) =>
        i % step === 0 || i === days.length - 1 ? (
          <text key={d.date} x={xAt(i)} y={H - 4} fontSize={9} fill="var(--color-ink-faint)" textAnchor="middle" className="font-data">
            {d.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

const BAR_COLORS = ["var(--color-s1)", "var(--color-s2)", "var(--color-s3)", "var(--color-s4)", "var(--color-s1)"];

export function ProductBars({ products }: { products: ProductTotal[] }) {
  const rowH = 30;
  const W = 320;
  const max = Math.max(...products.map((p) => p.value), 1);

  return (
    <svg viewBox={`0 0 ${W} ${products.length * rowH}`} role="img" aria-label="Top products by net revenue" className="w-full">
      {products.map((p, i) => {
        const y = i * rowH;
        const barW = (p.value / max) * (W - 16);
        return (
          <g key={p.name}>
            <text x={0} y={y + 11} fontSize={11.5} fill="var(--color-foreground)" fontWeight={600}>
              {p.name}
            </text>
            <rect x={0} y={y + 16} width={W - 16} height={7} rx={3.5} fill="var(--color-surface-2)" />
            <rect x={0} y={y + 16} width={barW} height={7} rx={3.5} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          </g>
        );
      })}
    </svg>
  );
}
