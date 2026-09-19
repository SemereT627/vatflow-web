"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/app/actions/sales";
import { calcLine, UNIT_OF_MEASURE_LABELS } from "@/lib/vat";
import type { NewSaleItemInput, Product } from "@/lib/types";

type Line = NewSaleItemInput & { key: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SaleForm({ products, vatRate }: { products: Product[]; vatRate: number }) {
  const router = useRouter();
  const [receiptNumber, setReceiptNumber] = useState("");
  const [saleDate, setSaleDate] = useState(todayIso());
  const [buyerName, setBuyerName] = useState("");
  const [buyerTin, setBuyerTin] = useState("");
  const [showBuyer, setShowBuyer] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const t = calcLine(line.quantity, line.unit_price, vatRate);
        return {
          totalValue: acc.totalValue + t.totalValue,
          vat: acc.vat + t.vat,
          valueAfterVat: acc.valueAfterVat + t.valueAfterVat,
        };
      },
      { totalValue: 0, vat: 0, valueAfterVat: 0 }
    );
  }, [lines, vatRate]);

  function addLine() {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = parseFloat(quantity);
    if (!product || !qty || qty <= 0) {
      setError("Pick an item and a valid quantity.");
      return;
    }
    setError(null);
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        product_id: product.id,
        description: product.name,
        unit_of_measure: product.unit_of_measure,
        quantity: qty,
        unit_price: product.unit_price_before_vat,
      },
    ]);
    setSelectedProductId("");
    setQuantity("1");
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptNumber.trim()) {
      setError("VAT receipt number is required.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one item sold.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createSale({
        vat_category: "G",
        type_of_sale: 1,
        buyer_tin: buyerTin || null,
        buyer_name: buyerName || null,
        sale_date: saleDate,
        mrc_number: null,
        vat_receipt_number: receiptNumber.trim(),
        items: lines.map(({ key: _key, ...rest }) => rest),
      });
      router.push("/sales");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the sale.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">VAT receipt number</label>
          <input
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="e.g. 00000312"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">Items sold</h2>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500">Item</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select item...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-500">Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>

        {lines.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="pb-1">Item</th>
                <th className="pb-1">Unit</th>
                <th className="pb-1">Qty</th>
                <th className="pb-1">Total</th>
                <th className="pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const t = calcLine(line.quantity, line.unit_price, vatRate);
                return (
                  <tr key={line.key} className="border-t border-gray-100">
                    <td className="py-1.5">{line.description}</td>
                    <td className="py-1.5">{UNIT_OF_MEASURE_LABELS[line.unit_of_measure]}</td>
                    <td className="py-1.5">{line.quantity}</td>
                    <td className="py-1.5">{t.valueAfterVat.toFixed(2)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowBuyer((v) => !v)}
          className="text-sm text-gray-500 underline"
        >
          {showBuyer ? "Hide buyer details" : "Add buyer details (optional)"}
        </button>
        {showBuyer && (
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Buyer name</label>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buyer TIN</label>
              <input
                value={buyerTin}
                onChange={(e) => setBuyerTin(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">Total (incl. VAT)</span>
        <span className="text-base font-semibold text-gray-900">
          {totals.valueAfterVat.toFixed(2)}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save sale"}
      </button>
    </form>
  );
}
