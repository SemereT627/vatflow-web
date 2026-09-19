import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route";
import { calcLine } from "@/lib/vat";

type IncomingItem = {
  productId: string | null;
  description: string;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
};

type IncomingSale = {
  clientId: string;
  vatReceiptNumber: string;
  saleDate: string;
  buyerTin: string | null;
  buyerName: string | null;
  items: IncomingItem[];
};

type SyncResult =
  | { clientId: string; status: "synced"; id: string }
  | { clientId: string; status: "rejected"; reason: string };

export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No shop for this user." }, { status: 403 });

  const { data: shop } = await supabase
    .from("shops")
    .select("vat_rate")
    .eq("id", profile.shop_id)
    .single();
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const { sales } = (await request.json()) as { sales: IncomingSale[] };
  const results: SyncResult[] = [];

  for (const sale of sales) {
    if (sale.items.length === 0) {
      results.push({ clientId: sale.clientId, status: "rejected", reason: "No items on sale." });
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("sales")
      .insert({
        shop_id: profile.shop_id,
        seller_id: user.id,
        client_id: sale.clientId,
        buyer_tin: sale.buyerTin,
        buyer_name: sale.buyerName,
        sale_date: sale.saleDate,
        vat_receipt_number: sale.vatReceiptNumber,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505" && insertError.message.includes("client_id")) {
        // Already synced in a prior attempt — look up its id and report success rather than erroring.
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("shop_id", profile.shop_id)
          .eq("client_id", sale.clientId)
          .single();
        results.push({ clientId: sale.clientId, status: "synced", id: existing?.id ?? "" });
        continue;
      }
      if (insertError.code === "23505" && insertError.message.includes("vat_receipt_number")) {
        results.push({
          clientId: sale.clientId,
          status: "rejected",
          reason: `Receipt #${sale.vatReceiptNumber} was already recorded.`,
        });
        continue;
      }
      results.push({ clientId: sale.clientId, status: "rejected", reason: insertError.message });
      continue;
    }

    const rows = sale.items.map((item) => {
      const totals = calcLine(item.quantity, item.unitPrice, shop.vat_rate);
      return {
        sale_id: inserted.id,
        product_id: item.productId,
        description: item.description,
        unit_of_measure: item.unitOfMeasure,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_value: totals.totalValue,
        vat: totals.vat,
        value_after_vat: totals.valueAfterVat,
      };
    });

    const { error: itemsError } = await supabase.from("sale_items").insert(rows);
    if (itemsError) {
      await supabase.from("sales").delete().eq("id", inserted.id);
      results.push({ clientId: sale.clientId, status: "rejected", reason: itemsError.message });
      continue;
    }

    results.push({ clientId: sale.clientId, status: "synced", id: inserted.id });
  }

  return NextResponse.json({ results });
}
