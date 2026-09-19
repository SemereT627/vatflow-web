import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { Product } from "@/lib/types";
import { SaleForm } from "@/components/sale-form";

export default async function NewSalePage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", session.shop.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-900">Record a sale</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter the VAT receipt exactly as issued to the buyer.
      </p>
      <SaleForm products={(products ?? []) as Product[]} vatRate={session.shop.vat_rate} />
    </div>
  );
}
