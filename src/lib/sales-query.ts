import { createClient } from "@/lib/supabase/client";
import { escapeLike } from "@/lib/utils";

export const SALES_PAGE_SIZE = 11;

export type ReviewStatus = "pending" | "approved" | "rejected";
/** List filter: every receipt, or only those in one review state. */
export type ReviewFilter = "all" | "pending" | "rejected";

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
) {
  return ["sales", "list", shopId, page, search, pageSize, review] as const;
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

export function salesStatsKey(shopId: string, search: string = "", review: ReviewFilter = "all") {
  return ["sales", "stats", shopId, search, review] as const;
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
): Promise<{ rows: SaleRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sales")
    .select(SALE_ROW_COLUMNS)
    .eq("shop_id", shopId);
  if (review !== "all") query = query.eq("review_status", review);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`,
    );
  }

  const { data, error } = await query
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as SaleRow[] };
}

export async function fetchSalesStats(
  shopId: string,
  search: string = "",
  review: ReviewFilter = "all",
): Promise<{ total: number }> {
  const supabase = createClient();
  let query = supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  if (review !== "all") query = query.eq("review_status", review);

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
