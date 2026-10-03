import type { SellerRow } from "@/lib/sellers-server";

export const SELLERS_PAGE_SIZE = 11;

export type { SellerRow };

export function sellersListKey(page: number, search: string = "") {
  return ["sellers", "list", page, search] as const;
}

/** Pass to invalidateQueries after any mutation. */
export const SELLERS_QUERY_PREFIX = ["sellers"] as const;

export async function fetchSellersPage(page: number, search: string = ""): Promise<{ rows: SellerRow[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (search.trim()) params.set("q", search.trim());
  const res = await fetch(`/api/admin/sellers?${params}`);
  if (!res.ok) throw new Error("Could not load sellers.");
  return res.json();
}
