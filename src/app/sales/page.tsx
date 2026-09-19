import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { formatEthiopianDate } from "@/lib/ethiopian";

export default async function SalesPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, vat_receipt_number, sale_date, buyer_name, sale_items(value_after_vat)")
    .eq("shop_id", session.shop.id)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Recent sales</h1>
        <Link
          href="/sales/new"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          + New sale
        </Link>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {(sales ?? []).map((sale) => {
          const total = (sale.sale_items as { value_after_vat: number }[]).reduce(
            (sum, item) => sum + item.value_after_vat,
            0
          );
          return (
            <div key={sale.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-gray-900">
                  Receipt #{sale.vat_receipt_number}
                </div>
                <div className="text-gray-500">
                  {formatEthiopianDate(sale.sale_date)}
                  {sale.buyer_name ? ` · ${sale.buyer_name}` : ""}
                </div>
              </div>
              <div className="font-medium text-gray-900">{total.toFixed(2)}</div>
            </div>
          );
        })}
        {(sales ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500">No sales recorded yet.</p>
        )}
      </div>
    </div>
  );
}
