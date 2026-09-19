import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { SaleForm, type SaleableProduct } from "@/components/sale-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SalesPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, vat_receipt_number, sale_date, buyer_name, sale_items(value_after_vat)")
      .eq("shop_id", session.shop.id)
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("products")
      .select("id, name, unit_price_before_vat, unit_of_measure, units(short_code)")
      .eq("shop_id", session.shop.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const saleableProducts = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit_price_before_vat: p.unit_price_before_vat,
    unit_of_measure: p.unit_of_measure,
    unit_short_code: (p.units as unknown as { short_code: string } | null)?.short_code ?? "—",
  })) satisfies SaleableProduct[];

  return (
    <div className="px-6 py-6 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Recent sales</h1>
        <SaleForm products={saleableProducts} vatRate={session.shop.vat_rate} />
      </div>

      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Value after VAT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(sales ?? []).map((sale) => {
              const total = (sale.sale_items as { value_after_vat: number }[]).reduce(
                (sum, item) => sum + item.value_after_vat,
                0
              );
              return (
                <TableRow key={sale.id}>
                  <TableCell className="font-semibold">#{sale.vat_receipt_number}</TableCell>
                  <TableCell className="text-ink-soft">{formatEthiopianDate(sale.sale_date)}</TableCell>
                  <TableCell className="text-ink-soft">{sale.buyer_name ?? "Walk-in customer"}</TableCell>
                  <TableCell className="num text-right font-semibold">{total.toFixed(2)} ETB</TableCell>
                </TableRow>
              );
            })}
            {(sales ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-ink-soft">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
