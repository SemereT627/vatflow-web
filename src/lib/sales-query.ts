import { createClient } from "@/lib/supabase/client";
import { escapeLike } from "@/lib/utils";
import { ethiopianMonthRange } from "@/lib/ethiopian";

export const SALES_PAGE_SIZE = 11;

export type ReviewStatus = "pending" | "approved" | "rejected";
/** List filter: every receipt, or only those in one review state. */
export type ReviewFilter = "all" | "pending" | "rejected";

/** Gregorian sale_date bounds for a "YYYY-M" Ethiopian month, or null for "" / anything malformed. */
export function periodRange(period: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(period);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 13) return null;
  return ethiopianMonthRange(Number(m[1]), Number(m[2]));
}

export type SaleRow = {
  id: string;
  vat_receipt_number: string;
  sale_date: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  mrc_number: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  sale_items: { value_after_vat: number }[];
};

export type SaleDetail = {
  id: string;
  vat_receipt_number: string;
  sale_date: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  mrc_number: string | null;
  vat_category: "G" | "S";
  client_id: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  seller_name: string | null;
  sale_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_value: number;
    vat: number;
    value_after_vat: number;
    units: { short_code: string } | null;
  }[];
};

export function salesListKey(
  shopId: string,
  page: number,
  search: string = "",
  pageSize: number = SALES_PAGE_SIZE,
  review: ReviewFilter = "all",
  period: string = "",
) {
  return ["sales", "list", shopId, page, search, pageSize, review, period] as const;
}

export function saleDetailKey(saleId: string) {
  return ["sales", "detail", saleId] as const;
}

export async function fetchSaleDetail(saleId: string): Promise<SaleDetail> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, vat_category, client_id, voided_at, voided_reason, review_status, review_note, reviewed_at, profiles!sales_seller_id_fkey(full_name), sale_items(id, description, quantity, unit_price, total_value, vat, value_after_vat, units(short_code))",
    )
    .eq("id", saleId)
    .single();

  if (error) throw new Error(error.message);
  const row = data as unknown as Omit<SaleDetail, "seller_name"> & {
    profiles: { full_name: string | null } | null;
  };
  return { ...row, seller_name: row.profiles?.full_name ?? null };
}

export function salesStatsKey(shopId: string, search: string = "", review: ReviewFilter = "all", period: string = "") {
  return ["sales", "stats", shopId, search, review, period] as const;
}

/** Shared list columns, also used by the server-rendered first page. */
export const SALE_ROW_COLUMNS =
  "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, voided_at, voided_reason, review_status, review_note, sale_items(value_after_vat)";

/** Pass to invalidateQueries after any mutation — ["sales"] prefix-matches both the list and stats keys. */
export const SALES_QUERY_PREFIX = ["sales"] as const;

export async function fetchSalesPage(
  shopId: string,
  page: number,
  search: string = "",
  pageSize: number = SALES_PAGE_SIZE,
  review: ReviewFilter = "all",
  period: string = "",
): Promise<{ rows: SaleRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sales")
    .select(SALE_ROW_COLUMNS)
    .eq("shop_id", shopId);
  if (review !== "all") query = query.eq("review_status", review);
  const range = periodRange(period);
  if (range) query = query.gte("sale_date", range.start).lte("sale_date", range.end);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`,
    );
  }

  const { data, error } = await query
    .order("sale_date", { ascending: false })
    // Same-width numbers sort as text = numeric order, so a receipt entered late
    // still lands in sequence. shortcut: machine (8-digit) and handwritten (7-digit)
    // series only group by day, not by series; add a series column if that matters.
    .order("vat_receipt_number", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as SaleRow[] };
}

export function periodTotalsKey(shopId: string, period: string) {
  return ["sales", "period-totals", shopId, period] as const;
}

/**
 * Month totals over every non-voided receipt in an Ethiopian month — the same
 * set the Ministry export covers, whatever list filter is active.
 */
export async function fetchPeriodTotals(
  shopId: string,
  period: string,
): Promise<{ receipts: number; beforeVat: number; vat: number; afterVat: number }> {
  const range = periodRange(period);
  const totals = { receipts: 0, beforeVat: 0, vat: 0, afterVat: 0 };
  if (!range) return totals;

  const supabase = createClient();
  const PAGE = 1000; // PostgREST's default row cap per request
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sales")
      .select("id, sale_items(total_value, vat, value_after_vat)")
      .eq("shop_id", shopId)
      .is("voided_at", null)
      .gte("sale_date", range.start)
      .lte("sale_date", range.end)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const sale of data ?? []) {
      totals.receipts += 1;
      for (const item of sale.sale_items) {
        totals.beforeVat += item.total_value;
        totals.vat += item.vat;
        totals.afterVat += item.value_after_vat;
      }
    }
    if (!data || data.length < PAGE) return totals;
  }
}

export async function fetchSalesStats(
  shopId: string,
  search: string = "",
  review: ReviewFilter = "all",
  period: string = "",
): Promise<{ total: number }> {
  const supabase = createClient();
  let query = supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  if (review !== "all") query = query.eq("review_status", review);
  const range = periodRange(period);
  if (range) query = query.gte("sale_date", range.start).lte("sale_date", range.end);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`,
    );
  }

  const { count } = await query;
  return { total: count ?? 0 };
}

export function reviewCountsKey(shopId: string) {
  return ["sales", "review-counts", shopId] as const;
}

/** Pending/rejected counts for the review filter tabs. */
export async function fetchReviewCounts(shopId: string): Promise<{ pending: number; rejected: number }> {
  const supabase = createClient();
  const count = async (status: ReviewStatus) =>
    (
      await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("review_status", status)
    ).count ?? 0;
  const [pending, rejected] = await Promise.all([count("pending"), count("rejected")]);
  return { pending, rejected };
}
