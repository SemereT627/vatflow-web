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
    .select("id, name, unit_price_before_vat, unit_of_measure")
    .eq("shop_id", profile.shop_id)
    .eq("is_active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: products });
}
