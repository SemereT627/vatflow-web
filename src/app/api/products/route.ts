import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
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

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, unit_price_before_vat, unit_of_measure, units(short_code)")
    .eq("shop_id", profile.shop_id)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("products/route.ts failed", error);
    return NextResponse.json({ error: "Couldn't load products." }, { status: 500 });
  }

  const data = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit_price_before_vat: p.unit_price_before_vat,
    unit_of_measure: p.unit_of_measure,
    unit_short_code: (p.units as unknown as { short_code: string } | null)?.short_code ?? "—",
  }));

  return NextResponse.json({ data });
}
