"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteProduct, setProductActive, updateProduct } from "@/app/actions/products";
import { PRODUCTS_QUERY_PREFIX } from "@/lib/products-query";
import type { Unit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProductForActions = {
  id: string;
  name: string;
  unit_price_before_vat: number;
  unit_of_measure: string;
  is_active: boolean;
  machine_code: number | null;
};

export function ProductStatusToggle({ product }: { product: ProductForActions }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setPending(true);
    setError(null);
    try {
      await setProductActive(product.id, !product.is_active);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={toggleActive}
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold disabled:opacity-50 ${
          product.is_active ? "bg-good-bg text-good" : "bg-surface-2 text-ink-soft"
        }`}
      >
        {product.is_active ? "Active" : "Inactive"}
      </button>
      {error && <p className="text-xs font-medium text-critical">{error}</p>}
    </div>
  );
}

export function ProductActions({ product, units }: { product: ProductForActions; units: Unit[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteProduct(product.id);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" title="Actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setError(null);
              setConfirmOpen(true);
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p className="text-xs font-medium text-critical">{error}</p>}

      <EditProductDialog product={product} units={units} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={(next) => !pending && setConfirmOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{product.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. If this product has recorded sales, deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, "Enter a product name."),
  price: z
    .string()
    .min(1, "Enter a price.")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a price greater than zero."),
  unit: z.string().min(1),
  machineCode: z
    .string()
    .trim()
    .refine((v) => v === "" || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0), "Enter a whole number greater than zero."),
});
type FormValues = z.infer<typeof schema>;

function EditProductDialog({
  product,
  units,
  open,
  onOpenChange,
}: {
  product: ProductForActions;
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: FormValues = {
    name: product.name,
    price: String(product.unit_price_before_vat),
    unit: product.unit_of_measure,
    machineCode: product.machine_code === null ? "" : String(product.machine_code),
  };
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await updateProduct(product.id, {
        name: values.name,
        unit_price_before_vat: parseFloat(values.price),
        unit_of_measure: values.unit,
        machine_code: values.machineCode === "" ? null : parseInt(values.machineCode, 10),
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save changes.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset(defaultValues);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Changes apply going forward — past sales keep the price they were recorded at.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Code</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" className="w-28" placeholder="e.g. 42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (before VAT)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.label} ({u.short_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
