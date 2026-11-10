import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { SaleForm, type SaleableProduct } from "@/components/sale-form";
import { SalesTable } from "@/components/sales-table";
import { MACHINE_PATTERN, SALES_PAGE_SIZE, SALE_ROW_COLUMNS, parseSeries, periodRange, type ReviewFilter, type SaleRow } from "@/lib/sales-query";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; review?: string; period?: string; series?: string }>;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const params = await searchParams;
  const requestedPage = parseInt(params.page ?? "1", 10);
  // Review filter is admin-only; sellers always see every receipt.
  const review: ReviewFilter =
    session.profile.role === "admin" && (params.review === "pending" || params.review === "rejected")
      ? params.review
      : "all";
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const from = (page - 1) * SALES_PAGE_SIZE;
  const to = from + SALES_PAGE_SIZE - 1;

  const range = periodRange(params.period ?? "");
  const period = range ? params.period! : "";
  let countQuery = supabase.from("sales").select("id", { count: "exact", head: true }).eq("shop_id", session.shop.id);
  let rowsQuery = supabase.from("sales").select(SALE_ROW_COLUMNS).eq("shop_id", session.shop.id);
  if (review !== "all") {
    countQuery = countQuery.eq("review_status", review);
    rowsQuery = rowsQuery.eq("review_status", review);
  }
  if (range) {
    countQuery = countQuery.gte("sale_date", range.start).lte("sale_date", range.end);
    rowsQuery = rowsQuery.gte("sale_date", range.start).lte("sale_date", range.end);
  }
  const series = parseSeries(params.series);
  if (series === "machine") {
    countQuery = countQuery.like("vat_receipt_number", MACHINE_PATTERN);
    rowsQuery = rowsQuery.like("vat_receipt_number", MACHINE_PATTERN);
  }
  if (series === "handwritten") {
    countQuery = countQuery.not("vat_receipt_number", "like", MACHINE_PATTERN);
    rowsQuery = rowsQuery.not("vat_receipt_number", "like", MACHINE_PATTERN);
  }

  const [{ count: totalCount }, { data: sales }, { data: products }] = await Promise.all([
    countQuery,
    rowsQuery
      .order("sale_date", { ascending: false })
      .order("vat_receipt_number", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("products")
      .select("id, name, unit_price_before_vat, unit_of_measure, units(short_code)")
      .eq("shop_id", session.shop.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const saleableProducts = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit_price_before_vat: p.unit_price_before_vat,
    unit_of_measure: p.unit_of_measure,
    unit_short_code: (p.units as unknown as { short_code: string } | null)?.short_code ?? "—",
  })) satisfies SaleableProduct[];

  const rows = (sales ?? []) as unknown as SaleRow[];
  const total = totalCount ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recent sales</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {total} sale{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {session.profile.role === "admin" && (
            <SaleForm products={saleableProducts} vatRate={session.shop.vat_rate} mode="import" />
          )}
          <SaleForm products={saleableProducts} vatRate={session.shop.vat_rate} />
        </div>
      </div>

      <SalesTable
        shopId={session.shop.id}
        isAdmin={session.profile.role === "admin"}
        initialPage={page}
        initialReview={review}
        initialPeriod={period}
        initialSeries={series}
        initialRows={rows}
        initialTotal={total}
      />
    </div>
  );
}
