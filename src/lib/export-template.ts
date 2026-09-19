export type TemplateColumn = { header: string; field: string };

/** Every field buildRow() in the export route can populate — the only valid `field` values for a template column. */
export const AVAILABLE_FIELDS: { field: string; label: string }[] = [
  { field: "vat_category", label: "VAT category (G/S)" },
  { field: "calendar_type", label: "Calendar type" },
  { field: "type_of_sale", label: "Type of sale (1/2/3)" },
  { field: "buyer_tin", label: "Buyer TIN" },
  { field: "buyer_name", label: "Buyer name" },
  { field: "sale_date_ec", label: "Date of sale (E.C.)" },
  { field: "mrc_number", label: "MRC number" },
  { field: "vat_receipt_number", label: "VAT receipt number" },
  { field: "description", label: "Description" },
  { field: "unit_of_measure", label: "Unit of measure (template ID 2-10)" },
  { field: "unit_label", label: "Unit label (e.g. M2)" },
  { field: "quantity", label: "Quantity" },
  { field: "unit_price", label: "Unit price" },
  { field: "total_value", label: "Total value" },
  { field: "vat", label: "VAT" },
  { field: "value_after_vat", label: "Value after VAT" },
];

export function fieldLabel(field: string): string {
  return AVAILABLE_FIELDS.find((f) => f.field === field)?.label ?? field;
}
