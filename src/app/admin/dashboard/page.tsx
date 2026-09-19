import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatEthiopianDate } from "@/lib/ethiopian";
import {
  TrendChart,
  ProductBars,
  Sparkline,
} from "@/components/dashboard-charts";
import {
  summarize,
  dailyTotals,
  topProducts,
  vatCategorySplit,
  sellerActivity,
  type DashboardSale,
} from "@/lib/dashboard";

const RANGE_OPTIONS = [7, 14, 30] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function loadSales(
  shopId: string,
  since: string,
): Promise<DashboardSale[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("sales")
    .select(
      "id, seller_id, vat_category, sale_date, vat_receipt_number, buyer_name, buyer_tin, client_id, profiles(full_name), sale_items(description, total_value, vat, value_after_vat)",
    )
    .eq("shop_id", shopId)
    .is("voided_at", null)
    .gte("sale_date", since)
    .order("sale_date", { ascending: true });

  return (rows ?? []).map((r) => ({
    id: r.id,
    seller_id: r.seller_id,
    vat_category: r.vat_category as "G" | "S",
    sale_date: r.sale_date,
    seller_name:
      (r.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Unknown",
    vat_receipt_number: r.vat_receipt_number,
    buyer_name: r.buyer_name,
    buyer_tin: r.buyer_tin,
    client_id: r.client_id,
    items: r.sale_items as DashboardSale["items"],
  }));
}

function pctDelta(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function saleGross(sale: DashboardSale): number {
  return sale.items.reduce((sum, item) => sum + item.value_after_vat, 0);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const requested = parseInt((await searchParams).range ?? "30", 10);
  const rangeDays: RangeDays = RANGE_OPTIONS.includes(requested as RangeDays)
    ? (requested as RangeDays)
    : 30;

  const today = isoDaysAgo(0);
  const start = isoDaysAgo(rangeDays - 1);
  const prevStart = isoDaysAgo(rangeDays * 2 - 1);

  const [sales, prevSalesAll] = await Promise.all([
    loadSales(session.shop.id, start),
    loadSales(session.shop.id, prevStart),
  ]);
  const prevSales = prevSalesAll.filter((s) => s.sale_date < start);

  const totals = summarize(sales);
  const prevTotals = summarize(prevSales);
  const daily = dailyTotals(sales, start, today);
  const products = topProducts(sales);
  const split = vatCategorySplit(sales);
  const sellers = sellerActivity(sales);
  const avgTicket = totals.receipts ? totals.gross / totals.receipts : 0;
  const prevAvgTicket = prevTotals.receipts
    ? prevTotals.gross / prevTotals.receipts
    : 0;
  const maxSellerValue = Math.max(...sellers.map((s) => s.value), 1);
  const recentSales = [...sales].reverse().slice(0, 10);

  const kpis = [
    {
      label: "Gross sales",
      value: `${totals.gross.toFixed(2)} ETB`,
      delta: pctDelta(totals.gross, prevTotals.gross),
      spark: daily.map((d) => d.net + d.vat),
    },
    {
      label: "VAT collected",
      value: `${totals.vat.toFixed(2)} ETB`,
      delta: pctDelta(totals.vat, prevTotals.vat),
      spark: daily.map((d) => d.vat),
    },
    {
      label: "Receipts issued",
      value: String(totals.receipts),
      delta: pctDelta(totals.receipts, prevTotals.receipts),
      spark: daily.map((d) => d.receipts),
    },
    {
      label: "Avg. basket",
      value: `${avgTicket.toFixed(2)} ETB`,
      delta: pctDelta(avgTicket, prevAvgTicket),
      spark: daily.map((d) => (d.receipts ? (d.net + d.vat) / d.receipts : 0)),
    },
  ];

  return (
    <div className="px-6 py-6 md:px-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Overview</h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {session.shop.business_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <Link
                key={opt}
                href={`/admin/dashboard?range=${opt}`}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  opt === rangeDays
                    ? "bg-surface-2 text-foreground"
                    : "text-ink-soft hover:text-foreground"
                }`}
              >
                {opt}d
              </Link>
            ))}
          </div>
          <Link
            href="/admin/reports"
            className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-ink"
          >
            Export XLSX
          </Link>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const up = k.delta >= 0;
          return (
            <div
              key={k.label}
              className="rounded-xl border border-line bg-surface p-4 shadow-sm"
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                {k.label}
              </div>
              <div className="num mt-1.5 text-xl font-semibold">{k.value}</div>
              <div
                className={`mt-1 flex items-center gap-1 text-xs font-bold ${up ? "text-good" : "text-critical"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  className="h-2.5 w-2.5 flex-none"
                >
                  {up ? (
                    <path d="M4 16l7-8 5 5 4-6M15 7h5v5" />
                  ) : (
                    <path d="M4 8l7 8 5-5 4 6M15 17h5v-5" />
                  )}
                </svg>
                <span className="truncate">
                  {Math.abs(k.delta).toFixed(1)}% vs prior {rangeDays}d
                </span>
              </div>
              <Sparkline values={k.spark} />
            </div>
          );
        })}
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Revenue &amp; VAT collected</h2>
              <p className="text-[11.5px] text-ink-soft">
                Net value after VAT vs. output VAT, by sale date
              </p>
            </div>
            <div className="flex gap-3 text-[11.5px] font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: "var(--color-s1)" }}
                />
                Net sales
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: "var(--color-s2)" }}
                />
                VAT collected
              </span>
            </div>
          </div>
          {daily.some((d) => d.net > 0) ? (
            <TrendChart days={daily} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">
              No sales recorded in this range yet — receipts synced from VatFlow
              Mobile will appear here.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Top products</h2>
          {products.length > 0 ? (
            <ProductBars products={products} />
          ) : (
            <p className="text-sm text-ink-soft">No sales recorded yet.</p>
          )}

          <h2 className="mb-2 mt-5 text-sm font-bold">VAT category split</h2>
          <div className="flex h-3.5 overflow-hidden rounded-full border border-line">
            <span
              style={{
                width: `${split.total ? (split.g / split.total) * 100 : 0}%`,
                background: "var(--color-s1)",
              }}
            />
            <span
              style={{
                width: `${split.total ? (split.s / split.total) * 100 : 0}%`,
                background: "var(--color-s3)",
              }}
            />
          </div>
          <div className="mt-2.5 space-y-1.5">
            <SplitRow
              color="var(--color-s1)"
              label="G — VAT applies"
              count={split.g}
              total={split.total}
            />
            <SplitRow
              color="var(--color-s3)"
              label="S — VAT exempt/special"
              count={split.s}
              total={split.total}
            />
          </div>
        </section>
      </div>

      <section className="mb-3 rounded-xl border border-line bg-surface shadow-sm">
        <div className="p-4 pb-0">
          <h2 className="text-sm font-bold">Recent sales</h2>
          <p className="mb-3 text-[11.5px] text-ink-soft">
            Receipts recorded in the selected range, newest first
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2.5">Receipt</th>
                <th className="px-4 py-2.5">Buyer</th>
                <th className="px-4 py-2.5">VAT cat.</th>
                <th className="px-4 py-2.5">Seller</th>
                <th className="px-4 py-2.5 text-right">Value after VAT</th>
                <th className="px-4 py-2.5">Source</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-line last:border-0 hover:bg-surface-2"
                >
                  <td className="num px-4 py-2.5">{sale.vat_receipt_number}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold">
                      {sale.buyer_name ?? "Walk-in customer"}
                    </div>
                    {sale.buyer_tin && (
                      <div className="text-[11px] text-ink-faint">
                        TIN {sale.buyer_tin}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded font-data text-[10.5px] font-bold"
                      style={{
                        background:
                          sale.vat_category === "G"
                            ? "color-mix(in srgb, var(--color-s1) 20%, transparent)"
                            : "color-mix(in srgb, var(--color-s3) 20%, transparent)",
                        color:
                          sale.vat_category === "G"
                            ? "var(--color-s1)"
                            : "var(--color-s3)",
                      }}
                    >
                      {sale.vat_category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{sale.seller_name}</td>
                  <td className="num px-4 py-2.5 text-right">
                    {saleGross(sale).toFixed(2)} ETB
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        sale.client_id
                          ? "bg-good-bg text-good"
                          : "bg-surface-2 text-ink-soft"
                      }`}
                    >
                      {sale.client_id ? "Mobile" : "Web"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-ink-soft"
                  >
                    No receipts in this range yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Seller activity</h2>
        <div className="divide-y divide-line">
          {sellers.map((s) => (
            <div key={s.name} className="flex items-center gap-3 py-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-2 font-heading text-xs font-bold">
                {s.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{s.name}</div>
                <div className="text-[11.5px] text-ink-soft">
                  {s.receipts} receipts
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(s.value / maxSellerValue) * 100}%` }}
                  />
                </div>
              </div>
              <div className="num flex-none text-[13px] font-semibold">
                {s.value.toFixed(2)} ETB
              </div>
            </div>
          ))}
          {sellers.length === 0 && (
            <p className="py-4 text-sm text-ink-soft">No sales recorded yet.</p>
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-ink-faint">
        {formatEthiopianDate(today)} E.C. · Sales are recorded on VatFlow Mobile
        and synced here automatically.
      </p>
    </div>
  );
}

function SplitRow({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="num font-bold">{pct}%</span>
    </div>
  );
}
