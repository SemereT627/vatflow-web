"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Plus } from "lucide-react";
import { createSeller } from "@/app/actions/sellers";
import { SELLERS_QUERY_PREFIX } from "@/lib/sellers-query";
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

const schema = z.object({
  fullName: z.string().trim().min(1, "Enter their name."),
  email: z.string().trim().email("Enter a valid email."),
});

type FormValues = z.infer<typeof schema>;
const DEFAULT_VALUES: FormValues = { fullName: "", email: "" };

export function SellerForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const { tempPassword } = await createSeller({ email: values.email, fullName: values.fullName });
      setResult({ email: values.email, tempPassword });
      queryClient.invalidateQueries({ queryKey: SELLERS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not add seller.");
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset(DEFAULT_VALUES);
      setResult(null);
      setServerError(null);
      setCopied(false);
    }
  }

  async function copyPassword() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the password is still visible to copy by hand
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add seller
        </Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Seller added</DialogTitle>
              <DialogDescription>
                Share this temporary password with {result.email} yourself — it won&apos;t be shown again.
                They should change it after signing in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-background px-3 py-2.5">
              <span className="num text-base font-semibold">{result.tempPassword}</span>
              <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add seller</DialogTitle>
              <DialogDescription>They&apos;ll be able to record sales for this shop.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Hana Tesfaye" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hana@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {serverError && <p className="text-sm text-critical">{serverError}</p>}

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Adding…" : "Add seller"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
