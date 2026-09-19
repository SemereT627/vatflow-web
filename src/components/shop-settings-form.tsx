"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateShop } from "@/app/actions/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Shop } from "@/lib/types";

const schema = z.object({
  business_name: z.string().trim().min(1, "Enter the business name."),
  owner_name: z.string().trim().min(1, "Enter the owner's name."),
  tin: z.string().trim().optional(),
  vat_rate_percent: z
    .string()
    .min(1, "Enter a VAT rate.")
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0 && n <= 100;
    }, "Enter a rate between 0 and 100."),
});

type FormValues = z.infer<typeof schema>;

export function ShopSettingsForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: shop.business_name,
      owner_name: shop.owner_name,
      tin: shop.tin ?? "",
      vat_rate_percent: String(shop.vat_rate * 100),
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);
    try {
      await updateShop({
        business_name: values.business_name,
        owner_name: values.owner_name,
        tin: values.tin || null,
        vat_rate: parseFloat(values.vat_rate_percent) / 100,
      });
      form.reset(values);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-lg space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm"
      >
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="owner_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner name</FormLabel>
              <p className="text-xs text-ink-soft">Printed on the VAT journal header.</p>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TIN</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vat_rate_percent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT rate (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" min="0" max="100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-ink-soft">
          Applies to sales recorded from now on — receipts already saved keep the VAT rate they were
          calculated with.
        </p>

        {serverError && <p className="text-sm text-critical">{serverError}</p>}
        {saved && !serverError && !form.formState.isDirty && <p className="text-sm font-semibold text-good">Saved.</p>}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
