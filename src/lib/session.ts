import { createClient } from "@/lib/supabase/server";
import type { Profile, Shop } from "@/lib/types";

export async function getCurrentProfile(): Promise<{ profile: Profile; shop: Shop } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Two-step sign-in: web sessions must have passed the authenticator-code
  // step (aal2). Every server action and page authorises through this, so a
  // password alone gets nothing. Reads the session JWT locally.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return null;

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
