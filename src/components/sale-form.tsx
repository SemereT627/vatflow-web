"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { createSale } from "@/app/actions/sales";
import { SALES_QUERY_PREFIX } from "@/lib/sales-query";
import { calcLine } from "@/lib/vat";
import type { NewSaleItemInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type SaleableProduct = {
  id: string;
  name: string;
  unit_price_before_vat: number;
  unit_of_measure: string;
  unit_short_code: string;
};

type Line = NewSaleItemInput & { key: string; unit_label: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const schema = z.object({
  receiptNumber: z.string().trim().min(1, "VAT receipt number is required."),
  saleDate: z.string().min(1),
  buyerName: z.string().trim().optional(),
  buyerTin: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SaleForm({ products, vatRate }: { products: SaleableProduct[]; vatRate: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showBuyer, setShowBuyer] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lineError, setLineError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { receiptNumber: "", saleDate: todayIso(), buyerName: "", buyerTin: "" },
  });

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

  function resetAll() {
    form.reset({ receiptNumber: "", saleDate: todayIso(), buyerName: "", buyerTin: "" });
    setLines([]);
    setSelectedProductId("");
    setQuantity("1");
    setLineError(null);
    setServerError(null);
    setShowBuyer(false);
  }

  function addLine() {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = parseFloat(quantity);
    if (!product || !qty || qty <= 0) {
      setLineError("Pick an item and a valid quantity.");
      return;
    }
    setLineError(null);
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        product_id: product.id,
        description: product.name,
        unit_of_measure: product.unit_of_measure,
        unit_label: product.unit_short_code,
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

  async function onSubmit(values: FormValues) {
    if (lines.length === 0) {
      setLineError("Add at least one item sold.");
      return;
    }
    setServerError(null);
    try {
      await createSale({
        vat_category: "G",
        type_of_sale: 1,
        buyer_tin: values.buyerTin || null,
        buyer_name: values.buyerName || null,
        sale_date: values.saleDate,
        mrc_number: null,
        vat_receipt_number: values.receiptNumber,
        items: lines.map(({ key: _key, unit_label: _unitLabel, ...rest }) => rest),
      });
      setOpen(false);
      resetAll();
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save the sale.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a sale</DialogTitle>
          <DialogDescription>Enter the VAT receipt exactly as issued to the buyer.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT receipt number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 00000312" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border border-line p-4">
              <h3 className="mb-3 text-sm font-bold">Items sold</h3>

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-40 flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Item</label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Quantity</label>
                  <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={addLine}>
                  Add
                </Button>
              </div>
              {lineError && <p className="mt-2 text-xs font-medium text-critical">{lineError}</p>}

              {lines.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-0">Item</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const t = calcLine(line.quantity, line.unit_price, vatRate);
                      return (
                        <TableRow key={line.key}>
                          <TableCell className="pl-0">{line.description}</TableCell>
                          <TableCell>{line.unit_label}</TableCell>
                          <TableCell className="num">{line.quantity}</TableCell>
                          <TableCell className="num text-right">{t.valueAfterVat.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)}>
                              <Trash2 className="h-3.5 w-3.5 text-critical" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowBuyer((v) => !v)}
                className="text-sm font-semibold text-ink-soft underline"
              >
                {showBuyer ? "Hide buyer details" : "Add buyer details (optional)"}
              </button>
              {showBuyer && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="buyerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buyerTin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer TIN</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm">
              <span className="font-semibold text-ink-soft">Total (incl. VAT)</span>
              <span className="num text-base font-bold">{totals.valueAfterVat.toFixed(2)} ETB</span>
            </div>

            {serverError && <p className="text-sm text-critical">{serverError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
