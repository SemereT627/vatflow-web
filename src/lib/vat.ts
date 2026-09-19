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

/** The Ministry of Revenue's own fixed unit codes — every shop unit maps to one of these on export. */
export const MINISTRY_UNIT_CODES: { code: number; label: string }[] = [
  { code: 2, label: "2 — KG" },
  { code: 3, label: "3 — ML" },
  { code: 4, label: "4 — GM" },
  { code: 5, label: "5 — LIT" },
  { code: 6, label: "6 — MT" },
  { code: 7, label: "7 — PCS" },
  { code: 8, label: "8 — CT" },
  { code: 9, label: "9 — OTHER" },
  { code: 10, label: "10 — PC" },
];
