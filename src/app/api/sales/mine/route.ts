import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route";

/**
 * GET /api/sales/mine — review status of the caller's mobile receipts, so
 * VatFlow Mobile can show Pending review / Approved / Rejected (with the
 * admin's note) in its History. Matched to local rows by client_id.
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
    .select("id, client_id, review_status, review_note, reviewed_at")
    .eq("seller_id", user.id)
    .not("client_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data ?? []).map((s) => ({
      id: s.id,
      clientId: s.client_id,
      reviewStatus: s.review_status,
      reviewNote: s.review_note,
      reviewedAt: s.reviewed_at,
    })),
  });
}
