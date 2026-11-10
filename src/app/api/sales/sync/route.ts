import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClientFromRequest } from "@/lib/supabase/route";

const itemSchema = z.object({
  productId: z.string().nullable(),
  description: z.string().max(500),
  unitOfMeasure: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

const saleSchema = z.object({
  clientId: z.string().min(1).max(100),
  vatReceiptNumber: z.string().min(1).max(50),
  saleDate: z.string(),
  buyerTin: z.string().max(50).nullable(),
  buyerName: z.string().max(200).nullable(),
  items: z.array(itemSchema).max(100),
});

const bodySchema = z.object({ sales: z.array(saleSchema).max(200) });

type SyncResult =
  | { clientId: string; status: "synced"; id: string }
  | { clientId: string; status: "rejected"; reason: string };

/**
 * Offline-queue upload from the mobile app. Each receipt goes through
 * create_sale (migration 0003), which checks shop/products/numbers, computes
 * VAT and writes the receipt + lines in one transaction, so a failure can't
 * leave an empty receipt holding the number.
 */
export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });

  const results: SyncResult[] = [];

  for (const sale of parsed.data.sales) {
    const { data: id, error } = await supabase.rpc("create_sale", {
      p_client_id: sale.clientId,
      p_vat_category: "G",
      p_type_of_sale: 1,
      p_buyer_tin: sale.buyerTin,
      p_buyer_name: sale.buyerName,
      p_sale_date: sale.saleDate,
      p_mrc_number: null,
      p_vat_receipt_number: sale.vatReceiptNumber,
      p_items: sale.items.map((item) => ({
        product_id: item.productId,
        description: item.description,
        unit_of_measure: item.unitOfMeasure,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });

    if (!error) {
      results.push({ clientId: sale.clientId, status: "synced", id: id as string });
      continue;
    }

    if (error.code === "23505" && error.message.includes("client_id")) {
      // Already synced in a prior attempt (receipt + lines are one
      // transaction, so it's complete) — report success with its id.
      const { data: existing } = await supabase
        .from("sales")
        .select("id")
        .eq("client_id", sale.clientId)
        .eq("seller_id", user.id)
        .maybeSingle();
      results.push(
        existing
          ? { clientId: sale.clientId, status: "synced", id: existing.id }
          : { clientId: sale.clientId, status: "rejected", reason: "Couldn't save this receipt." },
      );
      continue;
    }
    if (error.code === "23505" && error.message.includes("vat_receipt_number")) {
      results.push({
        clientId: sale.clientId,
        status: "rejected",
        reason: `Receipt #${sale.vatReceiptNumber} was already recorded.`,
      });
      continue;
    }
    if (error.code !== "P0001") console.error("sales/sync create_sale failed", sale.clientId, error);
    results.push({
      clientId: sale.clientId,
      status: "rejected",
      // P0001 = a check in create_sale; its message is written for people.
      reason: error.code === "P0001" ? error.message : "Couldn't save this receipt.",
    });
  }

  return NextResponse.json({ results });
}
