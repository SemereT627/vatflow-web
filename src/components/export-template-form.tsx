"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Columns3, Plus, Trash2 } from "lucide-react";
import { saveExportTemplate } from "@/app/actions/export-template";
import { AVAILABLE_FIELDS } from "@/lib/export-template";
import type { TemplateColumn } from "@/lib/export-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const schema = z.object({
  columns: z
    .array(
      z.object({
        header: z.string().trim().min(1, "Required"),
        field: z.string().min(1),
      })
    )
    .min(1, "Add at least one column."),
});

type FormValues = z.infer<typeof schema>;

export function ExportTemplateForm({ columns }: { columns: TemplateColumn[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { columns },
  });
  const { fields, append, remove, swap } = useFieldArray({ control: form.control, name: "columns" });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await saveExportTemplate(values.columns);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save the template.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset({ columns });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Columns3 />
          Configure columns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Export columns</DialogTitle>
          <DialogDescription>
            This is today&apos;s Ministry of Revenue XLSX format. If it changes, or you need extra columns
            for your own records, add, remove, or reorder them here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {fields.map((row, index) => (
              <div key={row.id} className="flex items-end gap-2 rounded-lg border border-line p-2.5">
                <div className="flex-1 space-y-1">
                  <label className="block text-[11px] font-semibold text-ink-soft">Column header</label>
                  <Input {...form.register(`columns.${index}.header` as const)} placeholder="e.g. VAT CATEGORY" />
                </div>
                <div className="w-52 space-y-1">
                  <label className="block text-[11px] font-semibold text-ink-soft">Data field</label>
                  <Controller
                    control={form.control}
                    name={`columns.${index}.field`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FIELDS.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex gap-1 pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => swap(index, index - 1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === fields.length - 1}
                    onClick={() => swap(index, index + 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-3.5 w-3.5 text-critical" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {form.formState.errors.columns?.message && (
            <p className="text-xs font-medium text-critical">{form.formState.errors.columns.message}</p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ header: "", field: AVAILABLE_FIELDS[0].field })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add column
          </Button>

          {serverError && <p className="text-sm text-critical">{serverError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
