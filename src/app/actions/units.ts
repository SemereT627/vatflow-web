"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createUnit(input: { label: string; short_code: string; ministry_code: number }) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage units.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    shop_id: session.shop.id,
    label: input.label,
    short_code: input.short_code.toUpperCase(),
    ministry_code: input.ministry_code,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export async function setUnitActive(unitId: string, isActive: boolean) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage units.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update({ is_active: isActive })
    .eq("id", unitId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}
