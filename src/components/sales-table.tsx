"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatEthiopianDate } from "@/lib/ethiopian";
import {
  SALES_PAGE_SIZE,
  fetchSalesPage,
  fetchSalesStats,
  salesListKey,
  salesStatsKey,
  type SaleRow,
} from "@/lib/sales-query";
import { SaleRowActions } from "@/components/sale-row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SalesTable({
  shopId,
  isAdmin,
  initialPage,
  initialRows,
  initialTotal,
}: {
  shopId: string;
  isAdmin: boolean;
  initialPage: number;
  initialRows: SaleRow[];
  initialTotal: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = parseInt(searchParams.get("page") ?? String(initialPage), 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;

  const stats = useQuery({
    queryKey: salesStatsKey(shopId),
    queryFn: () => fetchSalesStats(shopId),
    initialData: { total: initialTotal },
  });

  const list = useQuery({
    queryKey: salesListKey(shopId, page),
    queryFn: () => fetchSalesPage(shopId, page),
    placeholderData: keepPreviousData,
    initialData: page === initialPage ? { rows: initialRows } : undefined,
  });

  const total = stats.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / SALES_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = list.data?.rows ?? [];
  const from = (safePage - 1) * SALES_PAGE_SIZE;
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + rows.length, total);

  function goToPage(next: number) {
    router.push(`/sales?page=${next}`, { scroll: false });
  }

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${list.isFetching ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Value after VAT</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((sale) => {
              const totalAfterVat = sale.sale_items.reduce((sum, item) => sum + item.value_after_vat, 0);
              const voided = !!sale.voided_at;
              return (
                <TableRow key={sale.id} className={voided ? "opacity-60" : undefined}>
                  <TableCell className="font-semibold">
                    #{sale.vat_receipt_number}
                    {voided && (
                      <span
                        title={sale.voided_reason ?? undefined}
                        className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft"
                      >
                        Voided
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-soft">{formatEthiopianDate(sale.sale_date)}</TableCell>
                  <TableCell className="text-ink-soft">{sale.buyer_name ?? "Walk-in customer"}</TableCell>
                  <TableCell className="num text-right font-semibold">{totalAfterVat.toFixed(2)} ETB</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <SaleRowActions sale={sale} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isAdmin ? 5 : 4} className="py-20 text-center text-sm text-ink-soft">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-xs text-ink-soft">
          {total === 0 ? "No sales" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <PageButton onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1}>
            Previous
          </PageButton>
          <span className="text-xs text-ink-soft">
            Page {safePage} of {totalPages}
          </span>
          <PageButton onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages}>
            Next
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-soft enabled:hover:bg-surface-2 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:text-ink-faint"
    >
      {children}
    </button>
  );
}
