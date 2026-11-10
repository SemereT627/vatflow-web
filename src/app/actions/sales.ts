"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { NewSaleInput } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function createSale(input: NewSaleInput) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not signed in.");
  // shop/seller come from the session inside create_sale.

  if (input.items.length === 0) {
    throw new Error("Add at least one item.");
  }
  if (input.items.some((item) => !(item.quantity > 0))) {
    throw new Error("Each item's quantity must be greater than 0.");
  }

  const supabase = await createClient();

  // create_sale (migration 0003) checks the shop/products, computes VAT and
  // writes the receipt + lines in one transaction.
  const { data: saleId, error } = await supabase.rpc("create_sale", {
    p_client_id: null,
    p_vat_category: input.vat_category,
    p_type_of_sale: input.type_of_sale,
    p_buyer_tin: input.buyer_tin || null,
    p_buyer_name: input.buyer_name || null,
    p_sale_date: input.sale_date,
    p_mrc_number: input.mrc_number || null,
    p_vat_receipt_number: input.vat_receipt_number,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      description: item.description,
      unit_of_measure: item.unit_of_measure,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("vat_receipt_number")) {
      throw new Error(`Receipt #${input.vat_receipt_number} is already recorded.`);
    }
    // P0001 = a check in create_sale; its message is written for people.
    throw new Error(error.code === "P0001" ? error.message : "Couldn't save the sale.");
  }

  revalidatePath("/sales");
  return saleId as string;
}

/** Quantity, price, VAT category, and receipt number stay locked once recorded, since
 * they're already on a physical receipt and feed the VAT total. Buyer details and the
 * sale date (when it happened, not a VAT amount) can still be corrected. */
export async function updateSale(
  saleId: string,
  input: {
    buyer_name: string | null;
    buyer_tin: string | null;
    mrc_number: string | null;
    sale_date: string;
  }
) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can edit a recorded sale.");
  }
  if (!input.sale_date) {
    throw new Error("Sale date is required.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .update({
      buyer_name: input.buyer_name || null,
      buyer_tin: input.buyer_tin || null,
      mrc_number: input.mrc_number || null,
      sale_date: input.sale_date,
    })
    .eq("id", saleId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/sales");
  revalidatePath("/admin/dashboard");
}

export async function voidSale(saleId: string, reason: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can void a sale.");
  }
  if (!reason.trim()) {
    throw new Error("A reason is required to void a sale.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .update({
      voided_at: new Date().toISOString(),
      voided_reason: reason.trim(),
      voided_by: session.profile.id,
    })
    .eq("id", saleId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/sales");
  revalidatePath("/admin/reports/voided");
}

export async function restoreSale(saleId: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can restore a voided sale.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .update({ voided_at: null, voided_reason: null, voided_by: null })
    .eq("id", saleId)
    .eq("shop_id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/sales");
  revalidatePath("/admin/reports/voided");
}

/**
 * Admin review of a seller's mobile receipt. Only 'pending' receipts can be
 * reviewed — the status filter in the update makes a double-click or a
 * stale screen a no-op instead of overwriting a newer decision.
 */
async function reviewSale(saleId: string, status: "approved" | "rejected", note: string | null) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can review receipts.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .update({
      review_status: status,
      review_note: note,
      reviewed_by: session.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", saleId)
    .eq("shop_id", session.shop.id)
    .eq("review_status", "pending")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("This receipt isn't waiting for review any more.");

  revalidatePath("/sales");
  revalidatePath("/admin/dashboard");
  revalidatePath("/", "layout");
}

export async function approveSale(saleId: string) {
  await reviewSale(saleId, "approved", null);
}

export async function rejectSale(saleId: string, note: string) {
  if (!note.trim()) {
    throw new Error("Tell the seller what to fix.");
  }
  await reviewSale(saleId, "rejected", note.trim());
}
