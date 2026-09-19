"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/products";
import { UNIT_OF_MEASURE_LABELS } from "@/lib/vat";

export function ProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (!name.trim() || !priceNum || priceNum < 0) {
      setError("Enter a name and a valid price.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createProduct({
        name: name.trim(),
        unit_price_before_vat: priceNum,
        unit_of_measure: parseInt(unit, 10),
      });
      setName("");
      setPrice("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-4">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs text-gray-500">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="w-28">
        <label className="block text-xs text-gray-500">Price (before VAT)</label>
        <input
          type="number"
          step="any"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="w-28">
        <label className="block text-xs text-gray-500">Unit</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {Object.entries(UNIT_OF_MEASURE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Add product
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
