"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateShop(input: {
  business_name: string;
  owner_name: string;
  tin: string | null;
  vat_rate: number;
}) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can change shop settings.");
  }
  if (input.vat_rate < 0 || input.vat_rate > 1) {
    throw new Error("VAT rate must be between 0% and 100%.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({
      business_name: input.business_name,
      owner_name: input.owner_name,
      tin: input.tin || null,
      vat_rate: input.vat_rate,
    })
    .eq("id", session.shop.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/dashboard");
}
