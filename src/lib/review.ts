import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Mobile receipts waiting for an admin's review. Cached so the rail, header and dashboard share one query per request. */
export const pendingReviewCount = cache(async (shopId: string): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("review_status", "pending");
  return count ?? 0;
});
