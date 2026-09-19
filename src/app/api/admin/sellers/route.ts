import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/session";
import { getSellersPage } from "@/lib/sellers-server";

export async function GET(request: NextRequest) {
  const session = await getCurrentProfile();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const requestedPage = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;

  const { rows, total } = await getSellersPage(session.shop.id, page);
  return NextResponse.json({ rows, total });
}
