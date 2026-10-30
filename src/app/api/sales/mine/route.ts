import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route";

/**
 * GET /api/sales/mine — the caller's mobile receipts with their review status,
 * so VatFlow Mobile can show Pending review / Approved / Rejected (with the
 * admin's note) in its History. Matched to local rows by client_id; the full
 * receipt and its lines let a reinstalled app rebuild History from scratch.
 */
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, client_id, vat_receipt_number, sale_date, buyer_name, buyer_tin, created_at, review_status, review_note, reviewed_at, sale_items(product_id, description, unit_of_measure, quantity, unit_price)",
    )
    .eq("seller_id", user.id)
    .not("client_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data ?? []).map((s) => ({
      id: s.id,
      clientId: s.client_id,
      vatReceiptNumber: s.vat_receipt_number,
      saleDate: s.sale_date,
      buyerName: s.buyer_name,
      buyerTin: s.buyer_tin,
      createdAt: s.created_at,
      items: (s.sale_items ?? []).map((i) => ({
        productId: i.product_id,
        description: i.description,
        unitOfMeasure: i.unit_of_measure,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
      reviewStatus: s.review_status,
      reviewNote: s.review_note,
      reviewedAt: s.reviewed_at,
    })),
  });
}
