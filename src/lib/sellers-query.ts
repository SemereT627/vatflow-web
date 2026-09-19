import type { SellerRow } from "@/lib/sellers-server";

export const SELLERS_PAGE_SIZE = 11;

export type { SellerRow };

export function sellersListKey(page: number) {
  return ["sellers", "list", page] as const;
}

/** Pass to invalidateQueries after any mutation. */
export const SELLERS_QUERY_PREFIX = ["sellers"] as const;

export async function fetchSellersPage(page: number): Promise<{ rows: SellerRow[]; total: number }> {
  const res = await fetch(`/api/admin/sellers?page=${page}`);
  if (!res.ok) throw new Error("Could not load sellers.");
  return res.json();
}
