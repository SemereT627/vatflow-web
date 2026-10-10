"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { formatMoney } from "@/lib/utils";
import { fetchSaleDetail, saleDetailKey } from "@/lib/sales-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function SaleDetailDialog({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useQuery({
    queryKey: saleDetailKey(saleId ?? ""),
    queryFn: () => fetchSaleDetail(saleId as string),
    enabled: open && !!saleId,
  });

  const sale = detail.data;
  const totalAfterVat =
    sale?.sale_items.reduce((sum, item) => sum + item.value_after_vat, 0) ?? 0;
  const totalVat =
    sale?.sale_items.reduce((sum, item) => sum + item.vat, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {sale ? `Receipt #${sale.vat_receipt_number}` : "Sale detail"}
          </DialogTitle>
          {sale && (
            <DialogDescription>
              {formatEthiopianDate(sale.sale_date)} ·{" "}
              {sale.client_id ? "Mobile" : "Web"}
              {sale.voided_at && " · Voided"}
            </DialogDescription>
          )}
        </DialogHeader>

        {detail.isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sale…
          </div>
        )}

        {detail.isError && (
          <p className="py-6 text-center text-sm text-critical">
            Could not load this sale. Try again.
          </p>
        )}

        {sale && (
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm [&>div]:min-w-0">
              <Field
                label="Buyer"
                value={sale.buyer_name ?? "Walk-in customer"}
              />
              <Field label="Buyer TIN" value={sale.buyer_tin ?? "—"} />
              <Field label="MRC number" value={sale.mrc_number ?? "—"} />
              <Field
                label="VAT category"
                value={
                  sale.vat_category === "G"
                    ? "G — VAT applies"
                    : "S — Exempt/special"
                }
              />
              <Field label="Seller" value={sale.seller_name ?? "—"} />
              {sale.voided_at && (
                <Field label="Void reason" value={sale.voided_reason ?? "—"} />
              )}
            </div>

            <div className="min-w-0 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-120 text-[12.5px]">
                <thead className="border-b border-line bg-surface-2">
                  <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">VAT</th>
                    <th className="px-3 py-2 text-right">After VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.sale_items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="num px-3 py-2 text-right">
                        {item.quantity} {item.units?.short_code ?? ""}
                      </td>
                      <td className="num px-3 py-2 text-right">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="num px-3 py-2 text-right">
                        {formatMoney(item.vat)}
                      </td>
                      <td className="num px-3 py-2 text-right font-semibold">
                        {formatMoney(item.value_after_vat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
              <span className="text-ink-soft">
                VAT collected:{" "}
                <span className="num font-semibold text-foreground">
                  {formatMoney(totalVat)} ETB
                </span>
              </span>
              <span className="text-ink-soft">
                Total:{" "}
                <span className="num font-semibold text-foreground">
                  {formatMoney(totalAfterVat)} ETB
                </span>
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="wrap-break-word font-medium">{value}</p>
    </div>
  );
}
