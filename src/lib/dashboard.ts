export type DashboardSale = {
  id: string;
  seller_id: string;
  vat_category: "G" | "S";
  sale_date: string;
  seller_name: string;
  vat_receipt_number: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  client_id: string | null;
  items: { description: string; total_value: number; vat: number; value_after_vat: number }[];
};

export type DayTotal = { date: string; net: number; vat: number; receipts: number };
export type ProductTotal = { name: string; value: number };
export type SellerTotal = { name: string; receipts: number; value: number };

function saleTotals(sale: DashboardSale) {
  return sale.items.reduce(
    (acc, item) => ({
      net: acc.net + item.total_value,
      vat: acc.vat + item.vat,
      gross: acc.gross + item.value_after_vat,
    }),
    { net: 0, vat: 0, gross: 0 }
  );
}

export function summarize(sales: DashboardSale[]) {
  return sales.reduce(
    (acc, sale) => {
      const t = saleTotals(sale);
      acc.net += t.net;
      acc.vat += t.vat;
      acc.gross += t.gross;
      acc.receipts += 1;
      return acc;
    },
    { net: 0, vat: 0, gross: 0, receipts: 0 }
  );
}

/** One row per day in [start, end] (inclusive, ISO dates), zero-filled for days with no sales. */
export function dailyTotals(sales: DashboardSale[], start: string, end: string): DayTotal[] {
  const byDate = new Map<string, DayTotal>();
  for (const sale of sales) {
    const t = saleTotals(sale);
    const row = byDate.get(sale.sale_date) ?? { date: sale.sale_date, net: 0, vat: 0, receipts: 0 };
    row.net += t.net;
    row.vat += t.vat;
    row.receipts += 1;
    byDate.set(sale.sale_date, row);
  }

  const days: DayTotal[] = [];
  const cursor = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push(byDate.get(iso) ?? { date: iso, net: 0, vat: 0, receipts: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function topProducts(sales: DashboardSale[], limit = 5): ProductTotal[] {
  const byName = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      byName.set(item.description, (byName.get(item.description) ?? 0) + item.total_value);
    }
  }
  return [...byName.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function vatCategorySplit(sales: DashboardSale[]) {
  const g = sales.filter((s) => s.vat_category === "G").length;
  const s = sales.filter((s) => s.vat_category === "S").length;
  return { g, s, total: g + s };
}

export function sellerActivity(sales: DashboardSale[]): SellerTotal[] {
  const bySeller = new Map<string, SellerTotal>();
  for (const sale of sales) {
    const t = saleTotals(sale);
    const row = bySeller.get(sale.seller_id) ?? { name: sale.seller_name, receipts: 0, value: 0 };
    row.receipts += 1;
    row.value += t.gross;
    bySeller.set(sale.seller_id, row);
  }
  return [...bySeller.values()].sort((a, b) => b.value - a.value);
}
