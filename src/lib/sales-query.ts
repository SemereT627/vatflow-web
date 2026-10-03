import { createClient } from "@/lib/supabase/client";
import { escapeLike } from "@/lib/utils";

export const SALES_PAGE_SIZE = 11;

export type SaleRow = {
  id: string;
  vat_receipt_number: string;
  sale_date: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  mrc_number: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  sale_items: { value_after_vat: number }[];
};

export function salesListKey(shopId: string, page: number, search: string = "") {
  return ["sales", "list", shopId, page, search] as const;
}

export function salesStatsKey(shopId: string, search: string = "") {
  return ["sales", "stats", shopId, search] as const;
}

/** Pass to invalidateQueries after any mutation — ["sales"] prefix-matches both the list and stats keys. */
export const SALES_QUERY_PREFIX = ["sales"] as const;

export async function fetchSalesPage(
  shopId: string,
  page: number,
  search: string = ""
): Promise<{ rows: SaleRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * SALES_PAGE_SIZE;
  const to = from + SALES_PAGE_SIZE - 1;

  let query = supabase
    .from("sales")
    .select(
      "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, voided_at, voided_reason, sale_items(value_after_vat)"
    )
    .eq("shop_id", shopId);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`
    );
  }

  const { data, error } = await query
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as SaleRow[] };
}

export async function fetchSalesStats(shopId: string, search: string = ""): Promise<{ total: number }> {
  const supabase = createClient();
  let query = supabase.from("sales").select("id", { count: "exact", head: true }).eq("shop_id", shopId);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`
    );
  }

  const { count } = await query;
  return { total: count ?? 0 };
}
