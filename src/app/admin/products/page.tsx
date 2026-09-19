import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { Product } from "@/lib/types";
import { ProductForm } from "@/components/product-form";
import { UNIT_OF_MEASURE_LABELS } from "@/lib/vat";

export default async function AdminProductsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", session.shop.id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Products</h1>

      <ProductForm />

      <div className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200">
        {((products ?? []) as Product[]).map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium text-gray-900">{p.name}</div>
              <div className="text-gray-500">
                {p.unit_price_before_vat.toFixed(2)} / {UNIT_OF_MEASURE_LABELS[p.unit_of_measure]}
              </div>
            </div>
            {!p.is_active && <span className="text-xs text-gray-400">inactive</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
