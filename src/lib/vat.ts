export const DEFAULT_VAT_RATE = 0.15;

export type LineTotals = {
  totalValue: number;
  vat: number;
  valueAfterVat: number;
};

/** quantity * unit_price, split into VAT and pre-VAT total. Unit price is always before VAT. */
export function calcLine(quantity: number, unitPrice: number, vatRate = DEFAULT_VAT_RATE): LineTotals {
  const totalValue = round2(quantity * unitPrice);
  const vat = round2(totalValue * vatRate);
  return { totalValue, vat, valueAfterVat: round2(totalValue + vat) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const UNIT_OF_MEASURE_LABELS: Record<number, string> = {
  2: "KG",
  3: "ML",
  4: "GM",
  5: "LIT",
  6: "MT",
  7: "PCS",
  8: "CT",
  9: "OTHER",
  10: "PC",
};
