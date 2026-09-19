"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings2 } from "lucide-react";
import { createUnit, setUnitActive } from "@/app/actions/units";
import { MINISTRY_UNIT_CODES } from "@/lib/vat";
import type { Unit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ministry_code: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;
const DEFAULT_VALUES: FormValues = { label: "", short_code: "", ministry_code: "9" };

export function UnitForm({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createUnit({
        label: values.label,
        short_code: values.short_code,
        ministry_code: parseInt(values.ministry_code, 10),
      });
      form.reset(DEFAULT_VALUES);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save unit.");
    }
  }

  async function toggleActive(unit: Unit) {
    setPendingId(unit.id);
    try {
      await setUnitActive(unit.id, !unit.is_active);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not update unit.");
    } finally {
      setPendingId(null);
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Units of measure</DialogTitle>
          <DialogDescription>
            Add units specific to what you sell (e.g. M2 for tiles). Each one maps to a Ministry code for
            export — pick the closest match, or leave it as OTHER.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Ministry maps to</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">{u.label}</TableCell>
                  <TableCell className="num text-ink-soft">{u.short_code}</TableCell>
                  <TableCell className="text-ink-soft">
                    {MINISTRY_UNIT_CODES.find((m) => m.code === u.ministry_code)?.label ?? u.ministry_code}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.shop_id ? (
                      <button
                        type="button"
                        disabled={pendingId === u.id}
                        onClick={() => toggleActive(u)}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold disabled:opacity-50 ${
                          u.is_active ? "bg-good-bg text-good" : "bg-surface-2 text-ink-soft"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    ) : (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                        Default
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-[1.4fr_1fr_1.2fr_auto] items-end gap-2">
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
            <FormField
              control={form.control}
              name="ministry_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ministry code</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MINISTRY_UNIT_CODES.map((m) => (
                        <SelectItem key={m.code} value={String(m.code)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
