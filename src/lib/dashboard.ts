import { ethiopianMonthName, ethiopianMonthRange, gregorianToEthiopian } from "@/lib/ethiopian";

export const RANGE_OPTIONS = [7, 14, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(value: string | null | undefined): RangeDays {
  const n = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

export type DashboardSale = {
  id: string;
  seller_id: string;
  sale_date: string;
  vat_receipt_number: string;
  client_id: string | null;
  items: { description: string; total_value: number; vat: number; value_after_vat: number }[];
};

/**
 * A labelled date span, inclusive ISO dates. `key` is "YYYY-M" for Ethiopian
 * months (the Sales `period` param). Day and week labels are just the day
 * number, with the month only where it changes; `fullLabel` always has it.
 */
export type Span = { key: string; label: string; fullLabel: string; title: string; start: string; end: string };
export type Bar = { label: string; title: string; value: number; receipts: number };

export function saleTotals(sale: DashboardSale) {
  return sale.items.reduce(
    (acc, item) => ({
      net: acc.net + item.total_value,
      vat: acc.vat + item.vat,
      gross: acc.gross + item.value_after_vat,
    }),
    { net: 0, vat: 0, gross: 0 },
  );
}

/** Machine-issued receipt numbers are 8 digits; handwritten ones (power cuts) are shorter. */
const isHandwritten = (sale: DashboardSale) => sale.vat_receipt_number.length !== 8;

export function summarize(sales: DashboardSale[]) {
  const sellers = new Set<string>();
  const products = new Set<string>();
  const out = { net: 0, vat: 0, gross: 0, receipts: 0, mobile: 0, handwritten: 0, sellers: 0, products: 0 };
  for (const sale of sales) {
    const t = saleTotals(sale);
    out.net += t.net;
    out.vat += t.vat;
    out.gross += t.gross;
    out.receipts += 1;
    if (sale.client_id) out.mobile += 1;
    if (isHandwritten(sale)) out.handwritten += 1;
    sellers.add(sale.seller_id);
    for (const item of sale.items) products.add(item.description);
  }
  out.sellers = sellers.size;
  out.products = products.size;
  return out;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const inSpan = (sales: DashboardSale[], start: string, end: string) =>
  sales.filter((s) => s.sale_date >= start && s.sale_date <= end);

/** Percent change, or null when there is nothing to compare against. */
export function pctChange(current: number, previous: number): number | null {
  return previous ? ((current - previous) / previous) * 100 : null;
}

/** 186921 -> "186.9k", like the reference's "200.9k". */
export function compactNumber(v: number): string {
  const abs = Math.abs(v);
  const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `${fmt(v / 1_000_000)}M`;
  if (abs >= 1000) return `${fmt(v / 1000)}k`;
  return String(Math.round(v));
}

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Monday of the week holding `iso`. */
const weekStart = (iso: string) => addDays(iso, -((new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7));

/** "14", or "Oct 5" when the month differs from the previous span's. */
const dayLabel = (iso: string, prev: string) =>
  iso.slice(0, 7) === prev.slice(0, 7) ? String(Number(iso.slice(8))) : shortDate(iso);

export function daySpans(today: string, count: number): Span[] {
  return Array.from({ length: count }, (_, i) => {
    const d = addDays(today, i - count + 1);
    return { key: d, label: dayLabel(d, addDays(d, -1)), fullLabel: shortDate(d), title: longDate(d), start: d, end: d };
  });
}

export function weekSpans(today: string, count: number): Span[] {
  const last = weekStart(today);
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(last, (i - count + 1) * 7);
    return {
      key: start,
      label: dayLabel(start, addDays(start, -7)),
      fullLabel: shortDate(start),
      title: `Week of ${shortDate(start)}`,
      start,
      end: addDays(start, 6),
    };
  });
}

/** The last `count` Ethiopian months up to today's, Pagume included as its own month. */
export function ethiopianMonthSpans(today: string, count: number): Span[] {
  let { year, month } = gregorianToEthiopian(today);
  const spans: Span[] = [];
  for (let i = 0; i < count; i++) {
    const name = ethiopianMonthName(month);
    spans.unshift({
      key: `${year}-${month}`,
      label: name.slice(0, 3),
      fullLabel: name.slice(0, 3),
      title: `${name} ${year}`,
      ...ethiopianMonthRange(year, month),
    });
    month -= 1;
    if (month === 0) {
      month = 13;
      year -= 1;
    }
  }
  return spans;
}

/** Sales before VAT and receipt count per span. */
export function barsFor(sales: DashboardSale[], spans: Span[]): Bar[] {
  return spans.map((s) => {
    const rows = inSpan(sales, s.start, s.end);
    return {
      label: s.label,
      title: s.title,
      value: rows.reduce((sum, sale) => sum + saleTotals(sale).net, 0),
      receipts: rows.length,
    };
  });
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type HeatCell = { date: string; value: number; receipts: number; future: boolean };

/**
 * Sales before VAT per day for the last `weeks` weeks (Monday first), as
 * rows = weekdays and columns = weeks, plus the footer figures.
 */
export function weekdayHeatmap(sales: DashboardSale[], today: string, weeks: number) {
  const first = addDays(weekStart(today), -(weeks - 1) * 7);
  const byDate = new Map<string, { value: number; receipts: number }>();
  for (const sale of inSpan(sales, first, today)) {
    const row = byDate.get(sale.sale_date) ?? { value: 0, receipts: 0 };
    row.value += saleTotals(sale).net;
    row.receipts += 1;
    byDate.set(sale.sale_date, row);
  }

  const columns = Array.from({ length: weeks }, (_, w) => addDays(first, w * 7));
  const rows: HeatCell[][] = WEEKDAYS.map((_, day) =>
    columns.map((col) => {
      const date = addDays(col, day);
      return { date, ...(byDate.get(date) ?? { value: 0, receipts: 0 }), future: date > today };
    }),
  );

  const cells = rows.flat().filter((c) => !c.future);
  const peak = cells.reduce<HeatCell | null>((best, c) => (c.value > (best?.value ?? 0) ? c : best), null);
  const total = cells.reduce((sum, c) => sum + c.value, 0);
  const byWeekday = rows.map((r) => r.reduce((sum, c) => sum + c.value, 0));
  const busiest = byWeekday.indexOf(Math.max(...byWeekday));

  return {
    first,
    columns: columns.map(shortDate),
    rows,
    max: peak?.value ?? 0,
    peak: peak ? { date: peak.date, label: longDate(peak.date) } : null,
    busiestWeekday: total ? { label: WEEKDAYS[busiest], share: (byWeekday[busiest] / total) * 100 } : null,
    daysWithSales: cells.filter((c) => c.receipts > 0).length,
    days: cells.length,
  };
}

export type ProductShare = { name: string; value: number };

/** Top `limit` products by sales before VAT, the rest folded into "Other products". */
export function productShares(sales: DashboardSale[], limit = 5): ProductShare[] {
  const byName = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      byName.set(item.description, (byName.get(item.description) ?? 0) + item.total_value);
    }
  }
  const ranked = [...byName.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const rest = ranked.slice(limit).reduce((sum, p) => sum + p.value, 0);
  return rest > 0 ? [...ranked.slice(0, limit), { name: "Other products", value: rest }] : ranked;
}
