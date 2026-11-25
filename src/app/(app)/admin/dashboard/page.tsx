import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Landmark, Lightbulb, Plus, ReceiptText, ShoppingBasket, Sparkle, Wallet } from "lucide-react";
import { getCurrentProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { pendingReviewCount } from "@/lib/review";
import { ethiopianMonthName, ethiopianMonthRange, gregorianToEthiopian } from "@/lib/ethiopian";
import { addisTodayIso, formatMoney, formatNumber } from "@/lib/utils";
import { ChangePill, ExportPicker, ProductDonut, SalesBars, type BarView } from "@/components/dashboard-charts";
import {
  WEEKDAYS,
  addDays,
  barsFor,
  compactNumber,
  daySpans,
  ethiopianMonthSpans,
  inSpan,
  parseRange,
  pctChange,
  productShares,
  saleTotals,
  summarize,
  weekSpans,
  weekdayHeatmap,
  type DashboardSale,
} from "@/lib/dashboard";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request.

async function loadSales(shopId: string, since: string): Promise<DashboardSale[]> {
  const supabase = await createClient();
  const rows: DashboardSale[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sales")
      .select("id, seller_id, sale_date, vat_receipt_number, client_id, items:sale_items(description, total_value, vat, value_after_vat)")
      .eq("shop_id", shopId)
      .is("voided_at", null)
      .gte("sale_date", since)
      .order("sale_date")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("Could not load sales for the dashboard.");
    rows.push(...((data ?? []) as DashboardSale[]));
    if (!data || data.length < PAGE) return rows;
  }
}

type Change = { text: string; direction?: "up" | "down"; tone: "good" | "bad" | "warn" | "flat" };

/** % change chip; `upIsGood: false` keeps it grey (e.g. more handwritten receipts isn't a win). */
function pctChip(current: number, previous: number, upIsGood = true): Change | null {
  const c = pctChange(current, previous);
  if (c === null) return null;
  const up = c >= 0;
  return {
    text: `${up ? "+" : ""}${c.toFixed(1).replace(/\.0$/, "")}%`,
    direction: up ? "up" : "down",
    tone: upIsGood ? (up ? "good" : "bad") : "flat",
  };
}

/** Plain difference chip for small counts ("+1", "-2", "±0"). */
function diffChip(current: number, previous: number, unit = ""): Change {
  const d = Math.round((current - previous) * 10) / 10;
  if (d === 0) return { text: `±0${unit}`, tone: "flat" };
  return { text: `${d > 0 ? "+" : ""}${d}${unit}`, direction: d > 0 ? "up" : "down", tone: d > 0 ? "good" : "bad" };
}

const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const rangeDays = parseRange((await searchParams).range);
  const today = addisTodayIso();
  const start = addDays(today, -(rangeDays - 1));
  const prevStart = addDays(start, -rangeDays);
  const prevEnd = addDays(start, -1);

  const months = ethiopianMonthSpans(today, 24); // 12 shown + the 12 before, for the year-on-year change
  const weeks = weekSpans(today, 24);
  const days = daySpans(today, 28);
  const HEAT_WEEKS = 16;
  const since = [months[0].start, weeks[0].start, days[0].start, prevStart, addDays(today, -HEAT_WEEKS * 7)].sort()[0];

  const supabase = await createClient();
  const [all, pending, { count: activeProducts }] = await Promise.all([
    loadSales(session.shop.id, since),
    pendingReviewCount(session.shop.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", session.shop.id).eq("is_active", true),
  ]);

  const current = inSpan(all, start, today);
  const cur = summarize(current);
  const prev = summarize(inSpan(all, prevStart, prevEnd));
  const basket = cur.receipts ? cur.gross / cur.receipts : 0;
  const prevBasket = prev.receipts ? prev.gross / prev.receipts : 0;
  const rangeLabel = `previous ${rangeDays} days`;

  const kpis = [
    { label: "Gross sales", icon: Wallet, value: cur.gross, unit: "ETB", change: pctChip(cur.gross, prev.gross), href: "/sales" },
    { label: "VAT collected", icon: Landmark, value: cur.vat, unit: "ETB", change: pctChip(cur.vat, prev.vat), href: "/admin/reports" },
    { label: "Receipts issued", icon: ReceiptText, value: cur.receipts, change: pctChip(cur.receipts, prev.receipts), href: "/sales" },
    { label: "Avg. basket", icon: ShoppingBasket, value: basket, unit: "ETB", change: pctChip(basket, prevBasket), href: "/sales" },
  ];

  const signals: { label: string; value: string; title?: string; href?: string; change: Change | null }[] = [
    {
      label: "Sales before VAT",
      value: `${compactNumber(cur.net)} ETB`,
      title: `${formatMoney(cur.net)} ETB`,
      change: pctChip(cur.net, prev.net),
    },
    {
      label: "Pending review",
      value: formatNumber(pending),
      href: "/sales?review=pending",
      change: pending ? { text: "Review", tone: "warn" } : { text: "Clear", tone: "good" },
    },
    {
      label: "Mobile receipts",
      value: `${Math.round(share(cur.mobile, cur.receipts))}%`,
      change: prev.receipts ? diffChip(share(cur.mobile, cur.receipts), share(prev.mobile, prev.receipts), " pts") : null,
    },
    {
      label: "Handwritten receipts",
      value: formatNumber(cur.handwritten),
      href: "/sales?series=handwritten",
      change: pctChip(cur.handwritten, prev.handwritten, false),
    },
    { label: "Active sellers", value: formatNumber(cur.sellers), href: "/admin/sellers", change: diffChip(cur.sellers, prev.sellers) },
    {
      label: "Products sold",
      value: `${formatNumber(cur.products)} of ${formatNumber(activeProducts ?? 0)}`,
      href: "/admin/products",
      change: diffChip(cur.products, prev.products),
    },
  ];

  // Bars: each view shows the latest 12 (or 14) spans and compares their total with the same number before.
  const view = (key: string, label: string, spans: typeof months, shown: number, against: string): BarView => {
    const bars = barsFor(all, spans);
    const shownBars = bars.slice(-shown);
    shownBars[0] = { ...shownBars[0], label: spans[spans.length - shown].fullLabel }; // first bar always names its month
    const total = shownBars.reduce((s, b) => s + b.value, 0);
    const before = bars.slice(-shown * 2, -shown).reduce((s, b) => s + b.value, 0);
    return { key, label, bars: shownBars, total, change: pctChange(total, before), against };
  };
  const barViews = [
    view("daily", "Daily", days, 14, "previous 14 days"),
    view("weekly", "Weekly", weeks, 12, "previous 12 weeks"),
    view("monthly", "Monthly", months, 12, "previous 12 months"),
  ];

  const shares = productShares(current);
  const sharesTotal = shares.reduce((s, p) => s + p.value, 0);
  const topFive = shares.filter((p) => p.name !== "Other products").reduce((s, p) => s + p.value, 0);

  // Insight: this Ethiopian month so far vs the same days of the month before
  // (Nehase stands in for Pagume, which is only 5–6 days long).
  const ec = gregorianToEthiopian(today);
  const monthSpan = ethiopianMonthRange(ec.year, ec.month);
  let pm = ec.month - 1;
  let py = ec.year;
  if (pm === 0) {
    pm = 13;
    py -= 1;
  }
  if (pm === 13) pm = 12;
  const prevMonth = ethiopianMonthRange(py, pm);
  const prevSameDays = [addDays(prevMonth.start, ec.day - 1), prevMonth.end].sort()[0];
  const net = (rows: DashboardSale[]) => rows.reduce((s, sale) => s + saleTotals(sale).net, 0);
  const monthToDate = inSpan(all, monthSpan.start, today);
  const mtd = net(monthToDate);
  const mtdChange = pctChange(mtd, net(inSpan(all, prevMonth.start, prevSameDays)));
  const monthDays = (Date.parse(monthSpan.end) - Date.parse(monthSpan.start)) / 86_400_000 + 1;
  const monthName = ethiopianMonthName(ec.month);
  const filled = Math.round((ec.day / monthDays) * 10);

  const heat = weekdayHeatmap(all, today, HEAT_WEEKS);
  const level = (v: number) => (v > 0 && heat.max ? Math.max(1, Math.ceil((v / heat.max) * 4)) : 0);
  const peakRow = heat.peak ? (new Date(heat.peak.date + "T00:00:00Z").getUTCDay() + 6) % 7 : -1;

  const exportMonths = months.slice(-6);

  return (
    <div className="flex flex-1 flex-col gap-2.5 px-4 pb-6 md:px-8 lg:min-h-[840px]">
      <h1 className="sr-only">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <section key={k.label} className="rounded-2xl border border-line bg-surface px-5 pt-5 pb-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">
                <k.icon className="size-3.5 flex-none" aria-hidden="true" />
                <span className="truncate">{k.label}</span>
              </h2>
              <Link
                href={k.href}
                aria-label={`Open ${k.label.toLowerCase()} details`}
                className="flex size-7 flex-none items-center justify-center rounded-full bg-brand text-brand-ink transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <ArrowUpRight className="size-4" strokeWidth={2.5} />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="text-[30px] leading-none font-semibold tracking-tight tabular-nums"
                title={k.unit ? `${formatMoney(k.value)} ${k.unit}` : undefined}
              >
                {k.unit ? compactNumber(k.value) : formatNumber(k.value)}
                {k.unit && <span className="ml-1.5 text-sm font-medium tracking-normal text-ink-soft">{k.unit}</span>}
              </span>
              {k.change && <ChangePill {...k.change} title={`vs ${rangeLabel}`} />}
            </div>
          </section>
        ))}
      </div>

      {/* Ledger signals · sales bars · top products */}
      <div className="grid gap-2.5 md:grid-cols-2 lg:min-h-0 lg:flex-[1.37] lg:grid-cols-[minmax(0,277fr)_minmax(0,696fr)_minmax(0,337fr)]">
        <section className="flex min-h-72 flex-col rounded-2xl border border-line bg-surface p-4 lg:min-h-0">
          <div className="mb-3 flex items-center justify-between gap-2 pl-1">
            <h2 className="text-[15px] font-semibold">Ledger signals</h2>
            <Link
              href="/sales"
              aria-label="Record a sale on the Sales page"
              title="New sale"
              className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-ink-soft transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Plus className="size-4" />
            </Link>
          </div>
          <ul className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-10 [mask-image:linear-gradient(to_bottom,black_calc(100%-48px),transparent)]">
            {signals.map((s) => {
              const body = (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-ink-soft">
                      <span className="size-2 flex-none rounded-[3px] bg-brand/80" aria-hidden="true" />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="mt-1.5 text-[15px] font-semibold tabular-nums" title={s.title}>
                      {s.value}
                    </div>
                  </div>
                  {s.change && <ChangePill {...s.change} title={s.change.tone === "warn" ? undefined : `vs ${rangeLabel}`} />}
                </>
              );
              const cls = "flex items-center justify-between gap-2 rounded-xl bg-surface-2/70 px-3 py-2.5";
              return (
                <li key={s.label}>
                  {s.href ? (
                    <Link href={s.href} className={`${cls} transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex min-h-96 flex-col rounded-2xl border border-line bg-surface p-3 md:order-first md:col-span-2 lg:order-none lg:col-span-1 lg:min-h-0">
          <h2 className="sr-only">Sales before VAT</h2>
          <SalesBars views={barViews} initial="weekly" />
        </section>

        <section className="flex min-h-72 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 lg:min-h-0">
          <div className="flex items-center justify-between gap-2 pl-1">
            <h2 className="text-[15px] font-semibold">Top products</h2>
            <Link
              href="/admin/products"
              className="flex h-8 items-center gap-1 rounded-lg bg-brand px-3 text-[13px] font-semibold text-brand-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Last {rangeDays} days
              <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
          {shares.length > 0 ? (
            <>
              <div className="flex min-h-0 flex-1 items-center">
                <div className="w-full">
                  <ProductDonut shares={shares} total={sharesTotal} />
                </div>
              </div>
              <p className="rounded-xl border border-line bg-gradient-to-b from-transparent to-[#1c1e13] px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
                {shares.length > 5 ? "The top 5 products are " : "These products are "}
                <b className="font-semibold text-foreground">{Math.round(share(topFive, sharesTotal))}%</b> of sales before VAT;{" "}
                <b className="font-semibold text-foreground">{formatNumber(cur.products)}</b> of{" "}
                <b className="font-semibold text-foreground">{formatNumber(activeProducts ?? 0)}</b> active products sold.
              </p>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-sm text-ink-soft">No sales in the last {rangeDays} days.</p>
          )}
        </section>
      </div>

      {/* Insight · heatmap · export */}
      <div className="grid gap-2.5 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,368fr)_minmax(0,460fr)_minmax(0,480fr)]">
        <section className="relative flex min-h-64 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(140deg,#b4f562_0%,#9cea36_45%,#93f01a_100%)] p-5 text-[#0d0d0d] lg:min-h-0">
          <div aria-hidden="true" className="absolute -top-16 -right-16 size-44 rounded-full bg-[#86d020]/70">
            <Sparkle className="absolute bottom-12 left-11 size-7 fill-[#3d5c0c] text-[#3d5c0c]" />
            <Sparkle className="absolute bottom-[86px] left-7 size-2.5 fill-[#3d5c0c]/70 text-[#3d5c0c]/70" />
          </div>
          <span className="relative flex w-fit items-center gap-1.5 rounded-full bg-[#0d0d0d] px-3 py-1.5 text-xs font-medium text-brand">
            <Lightbulb className="size-3.5" aria-hidden="true" />
            Insights
          </span>
          <h2 className="relative mt-5 max-w-[19ch] text-[22px] leading-[1.3] font-semibold tracking-tight">
            {mtdChange !== null ? (
              <>
                {monthName} sales are {mtdChange >= 0 ? "up" : "down"}{" "}
                <span className="inline-block rounded-full border border-black/60 bg-white/20 px-2.5 leading-[1.25]">
                  {Math.abs(Math.round(mtdChange))}%
                </span>{" "}
                on the same {ec.day} days of {ethiopianMonthName(pm)}.
              </>
            ) : mtd > 0 ? (
              <>
                {monthName} sales so far:{" "}
                <span className="inline-block rounded-full border border-black/60 bg-white/20 px-2.5 leading-[1.25]">
                  {compactNumber(mtd)} ETB
                </span>{" "}
                from {formatNumber(monthToDate.length)} receipts.
              </>
            ) : (
              <>No sales recorded in {monthName} yet.</>
            )}
          </h2>
          <div className="relative mt-auto flex items-center gap-3 pt-5">
            <div className="flex min-w-0 flex-1 gap-1.5" role="img" aria-label={`Day ${ec.day} of ${monthDays} in ${monthName}`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-2.5 max-w-6 min-w-1.5 flex-1 rounded-[3px] ${i < filled ? "bg-[#0d0d0d]" : "bg-black/15"}`} />
              ))}
            </div>
            <span className="flex-none text-xs font-semibold whitespace-nowrap text-black/60">
              Day {ec.day} of {monthDays}
            </span>
          </div>
        </section>

        <section className="flex min-h-64 flex-col rounded-2xl border border-line bg-surface p-4 lg:min-h-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Sales by weekday and week</h2>
            <div className="flex items-center gap-1 text-[11px] text-ink-faint" aria-hidden="true">
              Low
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="size-2.5 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
              ))}
              High
            </div>
          </div>
          <div
            className="grid min-h-0 flex-1 gap-[5px]"
            style={{ gridTemplateColumns: `auto repeat(${HEAT_WEEKS}, minmax(0, 1fr))`, gridTemplateRows: "auto repeat(7, minmax(10px, 1fr))" }}
          >
            <span />
            {heat.columns
              .filter((_, i) => i % 4 === 0)
              .map((c) => (
                <span key={c} className="col-span-4 truncate text-[11px] text-ink-faint" aria-hidden="true">
                  {c}
                </span>
              ))}
            {heat.rows.map((row, r) => (
              <div key={WEEKDAYS[r]} className="contents">
                <span className={`pr-1.5 text-[11px] leading-none self-center ${r === peakRow ? "font-semibold text-foreground" : "text-ink-faint"}`}>
                  {WEEKDAYS[r]}
                </span>
                {row.map((cell) => (
                  <span
                    key={cell.date}
                    title={cell.future ? undefined : `${cell.date}: ${formatMoney(cell.value)} ETB, ${cell.receipts} receipts`}
                    className={`rounded-[4px] ${heat.peak?.date === cell.date ? "outline-1 outline-offset-1 outline-brand" : ""}`}
                    style={{ background: cell.future ? "transparent" : `var(--heat-${level(cell.value)})` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-line bg-gradient-to-b from-transparent to-[#1e2013] px-4 py-2.5">
            {[
              ["Busiest day", heat.peak?.label ?? "—"],
              [
                "Busiest weekday",
                heat.busiestWeekday ? `${heat.busiestWeekday.label} · ${Math.round(heat.busiestWeekday.share)}%` : "—",
              ],
              ["Days with sales", `${heat.daysWithSales} of ${heat.days}`],
            ].map(([k, v], i) => (
              <div key={k} className={i === 2 ? "text-right" : i === 1 ? "text-center" : ""}>
                <dt className="truncate text-[11px] text-ink-soft">{k}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex min-h-64 flex-col rounded-2xl border border-line bg-surface bg-[radial-gradient(circle_at_100%_0%,#1d1f14,transparent_60%)] p-5 md:col-span-2 lg:col-span-1 lg:min-h-0">
          <h2 className="text-[15px] font-semibold">Ministry export</h2>
          <p className="mt-1.5 text-[13px] text-ink-soft">Monthly VAT journal in the Ministry of Revenue format.</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {[
              { href: "/sales?review=pending", label: `Pending review · ${formatNumber(pending)}` },
              { href: `/sales?period=${exportMonths[exportMonths.length - 1].key}`, label: `${monthName} receipts` },
              { href: "/admin/reports/voided", label: "Voided receipts" },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-full border border-line bg-background/40 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
              >
                {c.label}
              </Link>
            ))}
          </div>
          <div className="mt-3">
            <ExportPicker months={exportMonths} />
          </div>
        </section>
      </div>
    </div>
  );
}
