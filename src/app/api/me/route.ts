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
    .select("full_name, role, shop_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No shop for this user." }, { status: 403 });

  const { data: shop } = await supabase
    .from("shops")
    .select("business_name, tin, vat_rate")
    .eq("id", profile.shop_id)
    .single();
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  return NextResponse.json({
    data: {
      email: user.email,
      full_name: profile.full_name,
      role: profile.role,
      shop: {
        business_name: shop.business_name,
        tin: shop.tin,
        vat_rate: shop.vat_rate,
      },
    },
  });
}
