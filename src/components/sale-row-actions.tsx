"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, RotateCcw, Ban } from "lucide-react";
import { restoreSale, updateSale, voidSale } from "@/app/actions/sales";
import { SALES_QUERY_PREFIX } from "@/lib/sales-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SaleForActions = {
  id: string;
  buyer_name: string | null;
  buyer_tin: string | null;
  mrc_number: string | null;
  vat_receipt_number: string;
  voided_at: string | null;
};

export function SaleRowActions({ sale }: { sale: SaleForActions }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRestore() {
    setPending(true);
    setError(null);
    try {
      await restoreSale(sale.id);
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore sale.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        {sale.voided_at ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleRestore}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
        ) : (
          <>
            <EditSaleDialog sale={sale} />
            <VoidSaleDialog saleId={sale.id} receiptNumber={sale.vat_receipt_number} />
          </>
        )}
      </div>
      {error && <p className="text-xs font-medium text-critical">{error}</p>}
    </div>
  );
}

const editSchema = z.object({
  buyer_name: z.string().trim().optional(),
  buyer_tin: z.string().trim().optional(),
  mrc_number: z.string().trim().optional(),
});
type EditValues = z.infer<typeof editSchema>;

function EditSaleDialog({ sale }: { sale: SaleForActions }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: EditValues = {
    buyer_name: sale.buyer_name ?? "",
    buyer_tin: sale.buyer_tin ?? "",
    mrc_number: sale.mrc_number ?? "",
  };
  const form = useForm<EditValues>({ resolver: zodResolver(editSchema), defaultValues });

  async function onSubmit(values: EditValues) {
    setServerError(null);
    try {
      await updateSale(sale.id, {
        buyer_name: values.buyer_name || null,
        buyer_tin: values.buyer_tin || null,
        mrc_number: values.mrc_number || null,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save changes.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Edit buyer details">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit receipt #{sale.vat_receipt_number}</DialogTitle>
          <DialogDescription>
            Only buyer details can be corrected here — amounts, VAT category, and the receipt number are
            locked once recorded. To fix a wrong amount, void this sale and record it again.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buyer_name"
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
              name="buyer_tin"
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
            <FormField
              control={form.control}
              name="mrc_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MRC number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && <p className="text-sm text-critical">{serverError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const voidSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason."),
});
type VoidValues = z.infer<typeof voidSchema>;

function VoidSaleDialog({ saleId, receiptNumber }: { saleId: string; receiptNumber: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<VoidValues>({ resolver: zodResolver(voidSchema), defaultValues: { reason: "" } });

  async function onSubmit(values: VoidValues) {
    setServerError(null);
    try {
      await voidSale(saleId, values.reason);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not void sale.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset({ reason: "" });
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Void this sale">
          <Ban className="h-3.5 w-3.5 text-critical" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void receipt #{receiptNumber}</DialogTitle>
          <DialogDescription>
            Kept in your records but excluded from VAT totals and the Ministry export. You can restore it
            later if this was a mistake.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Wrong amount entered, customer cancelled…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && <p className="text-sm text-critical">{serverError}</p>}

            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Voiding…" : "Void sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
