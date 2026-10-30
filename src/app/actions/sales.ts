"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { calcLine } from "@/lib/vat";
import type { NewSaleInput } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function createSale(input: NewSaleInput) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not signed in.");
  const { profile, shop } = session;

  if (input.items.length === 0) {
    throw new Error("Add at least one item.");
  }
  if (input.items.some((item) => !(item.quantity > 0))) {
    throw new Error("Each item's quantity must be greater than 0.");
  }

  const supabase = await createClient();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      shop_id: shop.id,
      seller_id: profile.id,
      vat_category: input.vat_category,
      type_of_sale: input.type_of_sale,
      buyer_tin: input.buyer_tin || null,
      buyer_name: input.buyer_name || null,
      sale_date: input.sale_date,
      mrc_number: input.mrc_number || null,
      vat_receipt_number: input.vat_receipt_number,
    })
    .select()
    .single();

  if (saleError) {
    if (saleError.code === "23505" && saleError.message.includes("vat_receipt_number")) {
      throw new Error(`Receipt #${input.vat_receipt_number} is already recorded.`);
    }
    throw new Error(saleError.message);
  }

  const rows = input.items.map((item) => {
    const totals = calcLine(item.quantity, item.unit_price, shop.vat_rate);
    return {
      sale_id: sale.id,
      product_id: item.product_id,
      description: item.description,
      unit_of_measure: item.unit_of_measure,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_value: totals.totalValue,
      vat: totals.vat,
      value_after_vat: totals.valueAfterVat,
    };
  });

  const { error: itemsError } = await supabase.from("sale_items").insert(rows);
  if (itemsError) {
    await supabase.from("sales").delete().eq("id", sale.id);
    throw new Error(itemsError.message);
  }

  revalidatePath("/sales");
  return sale.id;
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
