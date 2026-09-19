"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import type { TemplateColumn } from "@/lib/export-template";
import { revalidatePath } from "next/cache";

export async function saveExportTemplate(columns: TemplateColumn[]) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new Error("Only admins can configure the export template.");
  }
  if (columns.length === 0) {
    throw new Error("Add at least one column.");
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("export_templates")
    .select("id")
    .eq("shop_id", session.shop.id)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("export_templates").update({ columns }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("export_templates").insert({
      shop_id: session.shop.id,
      name: "ministry-default",
      columns,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/reports");
}
