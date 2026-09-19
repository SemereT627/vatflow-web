import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const SELLERS_PAGE_SIZE = 11;

export type SellerRow = {
  id: string;
  full_name: string;
  created_at: string;
  email: string;
  banned: boolean;
  hasSales: boolean;
};

function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

/** Server-only: combines a cookie-scoped profiles query with service-role Auth admin
 * lookups (email, ban status) — shared by the page's initial render and the API route
 * the client re-fetches from for subsequent pages. */
export async function getSellersPage(
  shopId: string,
  page: number
): Promise<{ rows: SellerRow[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * SELLERS_PAGE_SIZE;
  const to = from + SELLERS_PAGE_SIZE - 1;

  const [{ data: profiles, count }, { data: shopSales }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, created_at", { count: "exact" })
      .eq("shop_id", shopId)
      .eq("role", "seller")
      .order("created_at", { ascending: true })
      .range(from, to),
    supabase.from("sales").select("seller_id").eq("shop_id", shopId),
  ]);

  const salesCountBySeller = new Map<string, number>();
  for (const row of shopSales ?? []) {
    salesCountBySeller.set(row.seller_id, (salesCountBySeller.get(row.seller_id) ?? 0) + 1);
  }

  const sellers = profiles ?? [];
  const admin = createAdminClient();
  const details = new Map<string, { email: string; banned: boolean }>();
  await Promise.all(
    sellers.map(async (s) => {
      const { data } = await admin.auth.admin.getUserById(s.id);
      if (data.user) {
        details.set(s.id, {
          email: data.user.email ?? "—",
          banned: isCurrentlyBanned(data.user.banned_until ?? null),
        });
      }
    })
  );

  const rows: SellerRow[] = sellers.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    created_at: s.created_at,
    email: details.get(s.id)?.email ?? "—",
    banned: !!details.get(s.id)?.banned,
    hasSales: (salesCountBySeller.get(s.id) ?? 0) > 0,
  }));

  return { rows, total: count ?? 0 };
}
