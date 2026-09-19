"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { revalidatePath } from "next/cache";

/** Custom shop units have no natural slot in the Excel template's fixed list, so they always export as 9 (OTHER). */
const OTHER_EXPORT_CODE = 9;

export async function createUnit(input: { label: string; short_code: string }) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage units.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    shop_id: session.shop.id,
    label: input.label,
    short_code: input.short_code.toUpperCase(),
    export_code: OTHER_EXPORT_CODE,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export async function updateUnit(unitId: string, input: { label: string; short_code: string }) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage units.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update({
      label: input.label,
      short_code: input.short_code.toUpperCase(),
    })
    .eq("id", unitId)
    .eq("shop_id", session.shop.id);
  if (error) {
    if (error.code === "23505") throw new Error(`You already have a unit with the code "${input.short_code}".`);
    throw new Error(error.message);
  }

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

export async function deleteUnit(unitId: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage units.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", unitId).eq("shop_id", session.shop.id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("This unit is used by a product or sale — deactivate it instead of deleting.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/products");
}
