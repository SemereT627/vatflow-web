import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { VoidedSalesTable } from "@/components/voided-sales-table";
import { VOIDED_SALES_PAGE_SIZE, type VoidedSaleRow } from "@/lib/voided-sales-query";

export default async function VoidedSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const supabase = await createClient();
  const requestedPage = parseInt((await searchParams).page ?? "1", 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const from = (page - 1) * VOIDED_SALES_PAGE_SIZE;
  const to = from + VOIDED_SALES_PAGE_SIZE - 1;

  const [{ count: totalCount }, { data: sales }] = await Promise.all([
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", session.shop.id)
      .not("voided_at", "is", null),
    supabase
      .from("sales")
      .select(
        "id, vat_receipt_number, sale_date, buyer_name, buyer_tin, mrc_number, voided_at, voided_reason, profiles!sales_voided_by_fkey(full_name), sale_items(value_after_vat)"
      )
      .eq("shop_id", session.shop.id)
      .not("voided_at", "is", null)
      .order("voided_at", { ascending: false })
      .range(from, to),
  ]);

  const rows = (sales ?? []).map((row) => {
    const { profiles, ...rest } = row as unknown as Omit<VoidedSaleRow, "voided_by_name"> & {
      profiles: { full_name: string | null } | null;
    };
    return { ...rest, voided_by_name: profiles?.full_name ?? null };
  });
  const total = totalCount ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 md:px-10">
      <div>
        <h1 className="text-xl font-bold">Voided sales</h1>
        <p className="mt-0.5 text-sm text-ink-soft">
          {total} voided sale{total === 1 ? "" : "s"} — kept for audit, excluded from totals and exports.
        </p>
      </div>

      <VoidedSalesTable shopId={session.shop.id} initialPage={page} initialRows={rows} initialTotal={total} />
    </div>
  );
}
