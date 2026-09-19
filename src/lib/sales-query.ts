import { createClient } from "@/lib/supabase/client";

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

export function salesListKey(shopId: string, page: number) {
  return ["sales", "list", shopId, page] as const;
}

export function salesStatsKey(shopId: string) {
  return ["sales", "stats", shopId] as const;
}

/** Pass to invalidateQueries after any mutation — ["sales"] prefix-matches both the list and stats keys. */
export const SALES_QUERY_PREFIX = ["sales"] as const;

export async function fetchSalesPage(shopId: string, page: number): Promise<{ rows: SaleRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * SALES_PAGE_SIZE;
  const to = from + SALES_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, voided_at, voided_reason, sale_items(value_after_vat)"
    )
    .eq("shop_id", shopId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as SaleRow[] };
}

export async function fetchSalesStats(shopId: string): Promise<{ total: number }> {
  const supabase = createClient();
  const { count } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  return { total: count ?? 0 };
}
