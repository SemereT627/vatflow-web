"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Settings2, Trash2, X } from "lucide-react";
import { createUnit, deleteUnit, setUnitActive, updateUnit } from "@/app/actions/units";
import { PRODUCTS_QUERY_PREFIX } from "@/lib/products-query";
import type { Unit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const schema = z.object({
  label: z.string().trim().min(1, "Enter a unit name."),
  short_code: z
    .string()
    .trim()
    .min(1, "Enter a short code.")
    .max(8, "Keep it to 8 characters or fewer."),
});

type FormValues = z.infer<typeof schema>;
const DEFAULT_VALUES: FormValues = { label: "", short_code: "" };

export function UnitForm({ units }: { units: Unit[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createUnit(values);
      form.reset(DEFAULT_VALUES);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save unit.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 />
          Manage units
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Units of measure</DialogTitle>
          <DialogDescription>
            Add units specific to what you sell — e.g. M2 for tiles, Sack for grain.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) =>
                editingId === u.id ? (
                  <EditRow key={u.id} unit={u} onDone={() => setEditingId(null)} onError={setServerError} />
                ) : (
                  <ViewRow key={u.id} unit={u} onEdit={() => setEditingId(u.id)} onError={setServerError} />
                )
              )}
            </TableBody>
          </Table>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-[1.6fr_1fr_auto] items-end gap-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Meter square" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="short_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short code</FormLabel>
                  <FormControl>
                    <Input placeholder="M2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Add
            </Button>
          </form>
        </Form>
        {serverError && <p className="text-sm text-critical">{serverError}</p>}
      </DialogContent>
    </Dialog>
  );
}

function ViewRow({
  unit,
  onEdit,
  onError,
}: {
  unit: Unit;
  onEdit: () => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const isCustom = !!unit.shop_id;

  async function toggleActive() {
    setPending(true);
    onError(null);
    try {
      await setUnitActive(unit.id, !unit.is_active);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update unit.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${unit.label}"? This can't be undone.`)) return;
    setPending(true);
    onError(null);
    try {
      await deleteUnit(unit.id);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete unit.");
    } finally {
      setPending(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-semibold">{unit.label}</TableCell>
      <TableCell className="num text-ink-soft">{unit.short_code}</TableCell>
      <TableCell className="text-right">
        {isCustom ? (
          <button
            type="button"
            disabled={pending}
            onClick={toggleActive}
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold disabled:opacity-50 ${
              unit.is_active ? "bg-good-bg text-good" : "bg-surface-2 text-ink-soft"
            }`}
          >
            {unit.is_active ? "Active" : "Inactive"}
          </button>
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">Default</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isCustom && (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 text-critical" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function EditRow({
  unit,
  onDone,
  onError,
}: {
  unit: Unit;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(unit.label);
  const [shortCode, setShortCode] = useState(unit.short_code);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim() || !shortCode.trim()) {
      onError("Enter a name and short code.");
      return;
    }
    setSaving(true);
    onError(null);
    try {
      await updateUnit(unit.id, { label: label.trim(), short_code: shortCode.trim() });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_PREFIX });
      router.refresh();
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save unit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8" />
      </TableCell>
      <TableCell>
        <Input value={shortCode} onChange={(e) => setShortCode(e.target.value)} className="h-8 w-20" />
      </TableCell>
      <TableCell colSpan={2} className="text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={saving} onClick={onDone}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
