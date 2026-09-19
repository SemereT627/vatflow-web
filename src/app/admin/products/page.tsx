import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { Unit } from "@/lib/types";
import { ProductForm } from "@/components/product-form";
import { UnitForm } from "@/components/unit-form";
import { ProductsTable } from "@/components/products-table";
import { PRODUCTS_PAGE_SIZE, type ProductRow } from "@/lib/products-query";

export default async function AdminProductsPage({
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
  const from = (page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  const [
    { count: totalCount },
    { count: activeCount },
    { data: units },
    { data: products },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", session.shop.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", session.shop.id)
      .eq("is_active", true),
    supabase
      .from("units")
      .select("*")
      .or(`shop_id.eq.${session.shop.id},shop_id.is.null`)
      .order("export_code"),
    supabase
      .from("products")
      .select(
        "id, name, unit_price_before_vat, unit_of_measure, is_active, units(short_code)",
      )
      .eq("shop_id", session.shop.id)
      .order("created_at", { ascending: true })
      .range(from, to),
  ]);

  const allUnits = (units ?? []) as Unit[];
  const activeUnits = allUnits.filter((u) => u.is_active);
  const rows = (products ?? []) as unknown as ProductRow[];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {totalCount ?? 0} product{(totalCount ?? 0) === 1 ? "" : "s"} ·{" "}
            {activeCount ?? 0} active
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <UnitForm units={allUnits} />
          <ProductForm units={activeUnits} />
        </div>
      </div>

      <ProductsTable
        shopId={session.shop.id}
        units={allUnits}
        initialPage={page}
        initialRows={rows}
        initialTotal={totalCount ?? 0}
        initialActiveCount={activeCount ?? 0}
      />
    </div>
  );
}
