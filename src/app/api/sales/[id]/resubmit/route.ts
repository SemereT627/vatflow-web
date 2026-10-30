import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route";

type IncomingItem = {
  productId: string | null;
  description: string;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
};

/**
 * POST /api/sales/[id]/resubmit — a seller sends a rejected receipt back for
 * review after fixing it. All checks (own receipt, currently rejected) and
 * the VAT recalculation happen in the resubmit_sale database function, in
 * one transaction; this route only reshapes the payload.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    buyerName: string | null;
    buyerTin: string | null;
    saleDate: string;
    items: IncomingItem[];
  };

  const { error } = await supabase.rpc("resubmit_sale", {
    p_sale_id: id,
    p_buyer_name: body.buyerName,
    p_buyer_tin: body.buyerTin,
    p_sale_date: body.saleDate,
    p_items: (body.items ?? []).map((i) => ({
      product_id: i.productId,
      description: i.description,
      unit_of_measure: i.unitOfMeasure,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    })),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
