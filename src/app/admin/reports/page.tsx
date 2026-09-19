import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/report-form";
import { ExportTemplateForm } from "@/components/export-template-form";
import type { TemplateColumn } from "@/lib/export-template";

export default async function AdminReportsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("export_templates")
    .select("columns")
    .or(`shop_id.eq.${session.shop.id},shop_id.is.null`)
    .eq("is_active", true)
    .order("shop_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const columns = (template?.columns as TemplateColumn[]) ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Monthly journal</h1>
          <p className="text-sm text-ink-soft">
            Download VAT receipts in the Ministry of Revenue XLSX format.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportTemplateForm columns={columns} />
          <ReportForm />
        </div>
      </div>
    </div>
  );
}
