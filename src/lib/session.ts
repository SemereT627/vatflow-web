import { createClient } from "@/lib/supabase/server";
import type { Profile, Shop } from "@/lib/types";

export async function getCurrentProfile(): Promise<{ profile: Profile; shop: Shop } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", profile.shop_id)
    .single();
  if (!shop) return null;

  return { profile: profile as Profile, shop: shop as Shop };
}
