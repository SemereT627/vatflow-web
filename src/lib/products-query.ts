import { createClient } from "@/lib/supabase/client";
import { escapeLike } from "@/lib/utils";

export const PRODUCTS_PAGE_SIZE = 11;

export type ProductRow = {
  id: string;
  name: string;
  unit_price_before_vat: number;
  unit_of_measure: string;
  is_active: boolean;
  machine_code: number | null;
  units: { short_code: string } | null;
};

export function productsListKey(shopId: string, page: number, search: string = "") {
  return ["products", "list", shopId, page, search] as const;
}

export function productsStatsKey(shopId: string, search: string = "") {
  return ["products", "stats", shopId, search] as const;
}

/** Pass to invalidateQueries after any mutation — ["products"] prefix-matches both the list and stats keys. */
export const PRODUCTS_QUERY_PREFIX = ["products"] as const;

export async function fetchProductsPage(
  shopId: string,
  page: number,
  search: string = ""
): Promise<{ rows: ProductRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select("id, name, unit_price_before_vat, unit_of_measure, is_active, machine_code, units(short_code)")
    .eq("shop_id", shopId);

  const term = search.trim();
  if (term) {
    query = query.ilike("name", `%${escapeLike(term)}%`);
  }

  const { data, error } = await query
    .order("machine_code", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as ProductRow[] };
}

export async function fetchProductsStats(
  shopId: string,
  search: string = ""
): Promise<{ total: number; activeCount: number }> {
  const supabase = createClient();
  const term = search.trim();
  const pattern = term ? `%${escapeLike(term)}%` : null;

  let totalQuery = supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  let activeQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true);
  if (pattern) {
    totalQuery = totalQuery.ilike("name", pattern);
    activeQuery = activeQuery.ilike("name", pattern);
  }

  const [{ count: total }, { count: activeCount }] = await Promise.all([totalQuery, activeQuery]);
  return { total: total ?? 0, activeCount: activeCount ?? 0 };
}
