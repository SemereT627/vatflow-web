"use server";

import { getCurrentProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)];
  }
  return out;
}

export async function createSeller(input: { email: string; fullName: string }) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can add sellers.");
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createError) {
    if (createError.message.toLowerCase().includes("already been registered")) {
      throw new Error(`${input.email} already has an account.`);
    }
    throw new Error(createError.message);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    shop_id: session.shop.id,
    full_name: input.fullName,
    role: "seller",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/sellers");
  return { tempPassword };
}

/** Confirms the target profile is a seller in the admin's own shop — the admin client bypasses RLS, so this check is the only tenant boundary. */
async function assertOwnShopSeller(admin: ReturnType<typeof createAdminClient>, sellerId: string, shopId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, shop_id, role")
    .eq("id", sellerId)
    .single();
  if (!profile || profile.shop_id !== shopId || profile.role !== "seller") {
    throw new Error("Seller not found.");
  }
}

export async function setSellerBanned(sellerId: string, banned: boolean) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage sellers.");
  }

  const admin = createAdminClient();
  await assertOwnShopSeller(admin, sellerId, session.shop.id);

  const { error } = await admin.auth.admin.updateUserById(sellerId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sellers");
}

export async function deleteSeller(sellerId: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage sellers.");
  }

  const admin = createAdminClient();
  await assertOwnShopSeller(admin, sellerId, session.shop.id);

  const { count } = await admin
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId);
  if (count && count > 0) {
    throw new Error("This seller has recorded sales — deactivate them instead of deleting.");
  }

  const { error } = await admin.auth.admin.deleteUser(sellerId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sellers");
}
