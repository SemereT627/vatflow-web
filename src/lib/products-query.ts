import { createClient } from "@/lib/supabase/client";

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

export function productsListKey(shopId: string, page: number) {
  return ["products", "list", shopId, page] as const;
}

export function productsStatsKey(shopId: string) {
  return ["products", "stats", shopId] as const;
}

/** Pass to invalidateQueries after any mutation — ["products"] prefix-matches both the list and stats keys. */
export const PRODUCTS_QUERY_PREFIX = ["products"] as const;

export async function fetchProductsPage(shopId: string, page: number): Promise<{ rows: ProductRow[] }> {
  const supabase = createClient();
  const from = (page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("products")
    .select("id, name, unit_price_before_vat, unit_of_measure, is_active, machine_code, units(short_code)")
    .eq("shop_id", shopId)
    .order("machine_code", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as ProductRow[] };
}

export async function fetchProductsStats(shopId: string): Promise<{ total: number; activeCount: number }> {
  const supabase = createClient();
  const [{ count: total }, { count: activeCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("is_active", true),
  ]);
  return { total: total ?? 0, activeCount: activeCount ?? 0 };
}
