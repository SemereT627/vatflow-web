import { createClient } from "@/lib/supabase/client";
import { escapeLike } from "@/lib/utils";

export const VOIDED_SALES_PAGE_SIZE = 11;

export type VoidedSaleRow = {
  id: string;
  vat_receipt_number: string;
  sale_date: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  mrc_number: string | null;
  voided_at: string;
  voided_reason: string | null;
  voided_by_name: string | null;
  sale_items: { value_after_vat: number }[];
};

export function voidedSalesListKey(
  shopId: string,
  page: number,
  search: string = "",
  pageSize: number = VOIDED_SALES_PAGE_SIZE
) {
  return ["voided-sales", "list", shopId, page, search, pageSize] as const;
}

export function voidedSalesStatsKey(shopId: string, search: string = "") {
  return ["voided-sales", "stats", shopId, search] as const;
}

/** Pass to invalidateQueries after a restore — prefix-matches both the list and stats keys. */
export const VOIDED_SALES_QUERY_PREFIX = ["voided-sales"] as const;

const SELECT_COLUMNS =
  "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, voided_at, voided_reason, profiles!sales_voided_by_fkey(full_name), sale_items(value_after_vat)";

function toRow(raw: unknown): VoidedSaleRow {
  const row = raw as Omit<VoidedSaleRow, "voided_by_name"> & {
    profiles: { full_name: string | null } | null;
  };
  return { ...row, voided_by_name: row.profiles?.full_name ?? null };
}

export async function fetchVoidedSalesPage(
  shopId: string,
  page: number,
  search: string = "",
  pageSize: number = VOIDED_SALES_PAGE_SIZE
): Promise<{ rows: VoidedSaleRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sales")
    .select(SELECT_COLUMNS)
    .eq("shop_id", shopId)
    .not("voided_at", "is", null);

  const term = search.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    query = query.or(
      `buyer_name.ilike.${pattern},buyer_tin.ilike.${pattern},vat_receipt_number.ilike.${pattern},mrc_number.ilike.${pattern}`
    );
  }

  const { data, error } = await query.order("voided_at", { ascending: false }).range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []).map(toRow) };
}

export async function fetchVoidedSalesStats(shopId: string, search: string = ""): Promise<{ total: number }> {
  const supabase = createClient();
  let query = supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .not("voided_at", "is", null);

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
