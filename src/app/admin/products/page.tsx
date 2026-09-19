import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { Unit } from "@/lib/types";
import { ProductForm } from "@/components/product-form";
import { UnitForm } from "@/components/unit-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProductRow = {
  id: string;
  name: string;
  unit_price_before_vat: number;
  is_active: boolean;
  units: { short_code: string } | null;
};

export default async function AdminProductsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const supabase = await createClient();
  const [{ data: products }, { data: units }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit_price_before_vat, is_active, units(short_code)")
      .eq("shop_id", session.shop.id)
      .order("name"),
    supabase
      .from("units")
      .select("*")
      .or(`shop_id.eq.${session.shop.id},shop_id.is.null`)
      .order("export_code"),
  ]);

  const rows = (products ?? []) as unknown as ProductRow[];
  const allUnits = (units ?? []) as Unit[];
  const activeUnits = allUnits.filter((u) => u.is_active);

  return (
    <div className="px-6 py-6 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <div className="flex gap-2">
          <UnitForm units={allUnits} />
          <ProductForm units={activeUnits} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Price (before VAT)</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell className="text-ink-soft">{p.units?.short_code ?? "—"}</TableCell>
                <TableCell className="num text-right">{p.unit_price_before_vat.toFixed(2)} ETB</TableCell>
                <TableCell className="text-right">
                  {p.is_active ? (
                    <span className="rounded-full bg-good-bg px-2 py-0.5 text-[11px] font-bold text-good">Active</span>
                  ) : (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">Inactive</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-ink-soft">
                  No products yet. Add your first item above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
