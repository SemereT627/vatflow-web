"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { formatMoney } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useFillPageSize } from "@/hooks/use-fill-page-size";
import {
  VOIDED_SALES_PAGE_SIZE,
  fetchVoidedSalesPage,
  fetchVoidedSalesStats,
  voidedSalesListKey,
  voidedSalesStatsKey,
  type VoidedSaleRow,
} from "@/lib/voided-sales-query";
import { SaleRowActions } from "@/components/sale-row-actions";
import { TableSearchInput } from "@/components/table-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function VoidedSalesTable({
  shopId,
  initialPage,
  initialRows,
  initialTotal,
}: {
  shopId: string;
  initialPage: number;
  initialRows: VoidedSaleRow[];
  initialTotal: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = parseInt(searchParams.get("page") ?? String(initialPage), 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const urlSearch = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const search = useDebounce(searchInput, 300);
  const { containerRef, pageSize } = useFillPageSize(VOIDED_SALES_PAGE_SIZE);

  function goToPage(next: number, nextSearch: string = urlSearch) {
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    params.set("page", String(next));
    router.push(`/admin/reports/voided?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (search !== urlSearch) goToPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stats = useQuery({
    queryKey: voidedSalesStatsKey(shopId, urlSearch),
    queryFn: () => fetchVoidedSalesStats(shopId, urlSearch),
    initialData: urlSearch ? undefined : { total: initialTotal },
  });

  const list = useQuery({
    queryKey: voidedSalesListKey(shopId, page, urlSearch, pageSize),
    queryFn: () => fetchVoidedSalesPage(shopId, page, urlSearch, pageSize),
    placeholderData: keepPreviousData,
    initialData:
      page === initialPage && !urlSearch && pageSize === VOIDED_SALES_PAGE_SIZE
        ? { rows: initialRows }
        : undefined,
  });

  const total = stats.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = list.data?.rows ?? [];
  const from = (safePage - 1) * pageSize;
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + rows.length, total);

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center border-b border-line px-4 py-3">
        <TableSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search voided sales…" />
      </div>
      <div
        ref={containerRef}
        className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${list.isFetching ? "opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Value after VAT</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Voided by</TableHead>
              <TableHead>Voided at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((sale) => {
              const totalAfterVat = sale.sale_items.reduce((sum, item) => sum + item.value_after_vat, 0);
              return (
                <TableRow key={sale.id}>
                  <TableCell className="font-semibold">#{sale.vat_receipt_number}</TableCell>
                  <TableCell className="text-ink-soft">{formatEthiopianDate(sale.sale_date)}</TableCell>
                  <TableCell className="text-ink-soft">{sale.buyer_name ?? "Walk-in customer"}</TableCell>
                  <TableCell className="num text-right font-semibold">{formatMoney(totalAfterVat)} ETB</TableCell>
                  <TableCell className="max-w-[220px] truncate text-ink-soft" title={sale.voided_reason ?? undefined}>
                    {sale.voided_reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-ink-soft">{sale.voided_by_name ?? "—"}</TableCell>
                  <TableCell className="text-ink-soft">
                    {new Date(sale.voided_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <SaleRowActions sale={sale} />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-20 text-center text-sm text-ink-soft">
                  {urlSearch ? `No results for "${urlSearch}".` : "No voided sales."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-xs text-ink-soft">
          {total === 0 ? "No voided sales" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <PageButton onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1 || list.isFetching}>
            Previous
          </PageButton>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            {list.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            Page {safePage} of {totalPages}
          </span>
          <PageButton onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages || list.isFetching}>
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
