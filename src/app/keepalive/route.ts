import { NextResponse } from "next/server";

/**
 * Activity heartbeat for SessionTimeout. Does nothing itself — the request
 * passing through src/proxy.ts is what refreshes the last_activity cookie,
 * so typing in a long form (no navigation) doesn't count as idle server-side.
 */
export function GET() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
