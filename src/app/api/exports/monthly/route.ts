import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/session";
import { ethiopianMonthRange, formatEthiopianDate, journalTitle } from "@/lib/ethiopian";

type TemplateColumn = { header: string; field: string; format?: string };

/** Flattens one sale + one line item into the field names the export template can reference. */
function buildRow(sale: SaleWithItems, item: SaleWithItems["sale_items"][number]) {
  return {
    vat_category: sale.vat_category,
    calendar_type: "E",
    type_of_sale: sale.type_of_sale,
    buyer_tin: sale.buyer_tin ?? "",
    buyer_name: sale.buyer_name ?? "",
    sale_date_ec: formatEthiopianDate(sale.sale_date),
    mrc_number: sale.mrc_number ?? "",
    vat_receipt_number: sale.vat_receipt_number,
    description: item.description,
    unit_of_measure: item.units?.export_code ?? 9,
    unit_label: item.units?.short_code ?? "",
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_value: item.total_value,
    vat: item.vat,
    value_after_vat: item.value_after_vat,
  };
}

type SaleWithItems = {
  vat_category: string;
  type_of_sale: number;
  buyer_tin: string | null;
  buyer_name: string | null;
  sale_date: string;
  mrc_number: string | null;
  vat_receipt_number: string;
  sale_items: {
    description: string;
    quantity: number;
    unit_price: number;
    total_value: number;
    vat: number;
    value_after_vat: number;
    units: { export_code: number; short_code: string } | null;
  }[];
};

export async function GET(request: NextRequest) {
  const session = await getCurrentProfile();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  const month = parseInt(request.nextUrl.searchParams.get("month") ?? "", 10);
  if (!year || !month || month < 1 || month > 13) {
    return NextResponse.json({ error: "Provide a valid Ethiopian year and month (1-13)." }, { status: 400 });
  }

  const supabase = await createClient();
  const { start, end } = ethiopianMonthRange(year, month);

  const { data: sales, error } = await supabase
    .from("sales")
    .select(
      "vat_category, type_of_sale, buyer_tin, buyer_name, sale_date, mrc_number, vat_receipt_number, sale_items(description, quantity, unit_price, total_value, vat, value_after_vat, units(export_code, short_code))"
    )
    .eq("shop_id", session.shop.id)
    .is("voided_at", null)
    .gte("sale_date", start)
    .lte("sale_date", end)
    .order("sale_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: template } = await supabase
    .from("export_templates")
    .select("columns")
    .or(`shop_id.eq.${session.shop.id},shop_id.is.null`)
    .eq("is_active", true)
    .order("shop_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const columns = (template?.columns as TemplateColumn[]) ?? [];

  const title = journalTitle(session.shop.owner_name, month, year);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.field, width: 20 }));

  for (const sale of (sales ?? []) as unknown as SaleWithItems[]) {
    for (const item of sale.sale_items) {
      sheet.addRow(buildRow(sale, item));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${title}.xlsx"`,
    },
  });
}
