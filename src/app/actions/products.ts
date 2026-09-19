"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createProduct(input: {
  name: string;
  unit_price_before_vat: number;
  unit_of_measure: string;
}) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage products.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    shop_id: session.shop.id,
    name: input.name,
    unit_price_before_vat: input.unit_price_before_vat,
    unit_of_measure: input.unit_of_measure,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export async function updateProduct(
  productId: string,
  input: { name: string; unit_price_before_vat: number; unit_of_measure: string }
) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage products.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      unit_price_before_vat: input.unit_price_before_vat,
      unit_of_measure: input.unit_of_measure,
    })
    .eq("id", productId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export async function deleteProduct(productId: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage products.");
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("sale_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if (count && count > 0) {
    throw new Error("This product has recorded sales — deactivate it instead of deleting.");
  }

  const { error } = await supabase.from("products").delete().eq("id", productId).eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export async function setProductActive(productId: string, isActive: boolean) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can manage products.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}
