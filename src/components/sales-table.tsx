"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ethiopianMonthName, formatEthiopianDate, gregorianToEthiopian } from "@/lib/ethiopian";
import { addisTodayIso, formatGregorianDate, formatMoney } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useFillPageSize } from "@/hooks/use-fill-page-size";
import {
  SALES_PAGE_SIZE,
  fetchReviewCounts,
  fetchSalesPage,
  fetchPeriodTotals,
  fetchSalesStats,
  periodRange,
  periodTotalsKey,
  reviewCountsKey,
  salesListKey,
  salesStatsKey,
  type ReviewFilter,
  type SaleRow,
} from "@/lib/sales-query";
import { SaleRowActions } from "@/components/sale-row-actions";
import { SaleDetailDialog } from "@/components/sale-detail-dialog";
import { TableSearchInput } from "@/components/table-search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SalesTable({
  shopId,
  isAdmin,
  initialPage,
  initialReview,
  initialPeriod,
  initialRows,
  initialTotal,
}: {
  shopId: string;
  isAdmin: boolean;
  initialPage: number;
  initialReview: ReviewFilter;
  initialPeriod: string;
  initialRows: SaleRow[];
  initialTotal: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = parseInt(
    searchParams.get("page") ?? String(initialPage),
    10,
  );
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const urlSearch = searchParams.get("q") ?? "";
  const reviewParam = searchParams.get("review");
  const review: ReviewFilter =
    isAdmin && (reviewParam === "pending" || reviewParam === "rejected") ? reviewParam : "all";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const periodParam = searchParams.get("period") ?? "";
  const period = periodRange(periodParam) ? periodParam : "";
  const currentYear = gregorianToEthiopian(addisTodayIso()).year;
  const [periodYear, periodMonth] = period ? period.split("-").map(Number) : [currentYear, 0];
  const search = useDebounce(searchInput, 300);
  const { containerRef, pageSize } = useFillPageSize(SALES_PAGE_SIZE);

  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);

  function goToPage(
    next: number,
    changes: { search?: string; review?: ReviewFilter; period?: string } = {},
    navigate: "push" | "replace" = "push",
  ) {
    const { search: nextSearch = urlSearch, review: nextReview = review, period: nextPeriod = period } = changes;
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextReview !== "all") params.set("review", nextReview);
    if (nextPeriod) params.set("period", nextPeriod);
    params.set("page", String(next));
    router[navigate](`/sales?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (search !== urlSearch) goToPage(1, { search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const matchesServerRender = !urlSearch && review === initialReview && period === initialPeriod;

  const stats = useQuery({
    queryKey: salesStatsKey(shopId, urlSearch, review, period),
    queryFn: () => fetchSalesStats(shopId, urlSearch, review, period),
    initialData: matchesServerRender ? { total: initialTotal } : undefined,
  });

  const list = useQuery({
    queryKey: salesListKey(shopId, page, urlSearch, pageSize, review, period),
    queryFn: () => fetchSalesPage(shopId, page, urlSearch, pageSize, review, period),
    placeholderData: keepPreviousData,
    initialData:
      page === initialPage && matchesServerRender && pageSize === SALES_PAGE_SIZE
        ? { rows: initialRows }
        : undefined,
  });

  const reviewCounts = useQuery({
    queryKey: reviewCountsKey(shopId),
    queryFn: () => fetchReviewCounts(shopId),
    enabled: isAdmin,
  });

  const periodTotals = useQuery({
    queryKey: periodTotalsKey(shopId, period),
    queryFn: () => fetchPeriodTotals(shopId, period),
    enabled: !!period,
  });

  const total = stats.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = list.data?.rows ?? [];
  const from = (safePage - 1) * pageSize;
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + rows.length, total);

  // The URL can point past the last page — after approving the last pending
  // receipt on a page, or once a taller window fits more rows per page.
  useEffect(() => {
    if (stats.isSuccess && page > totalPages) goToPage(totalPages, {}, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.isSuccess, page, totalPages]);

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        {isAdmin && (
          <div className="flex gap-0.5 rounded-lg border border-line bg-background p-0.5" role="tablist" aria-label="Review status">
            {(
              [
                { key: "all", label: "All" },
                { key: "pending", label: "Pending review", count: reviewCounts.data?.pending },
                { key: "rejected", label: "Rejected", count: reviewCounts.data?.rejected },
              ] as const
            ).map((tab) => {
              const active = review === tab.key;
              const count = "count" in tab ? tab.count : undefined;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => goToPage(1, { review: tab.key })}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${
                    active ? "bg-surface-2 text-foreground" : "text-ink-soft hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {!!count && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        tab.key === "pending" ? "bg-warn-bg text-warn" : "bg-critical-bg text-critical"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(periodMonth)}
            onValueChange={(v) => goToPage(1, { period: v === "0" ? "" : `${periodYear}-${v}` })}
          >
            <SelectTrigger className="w-36" aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All months</SelectItem>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {ethiopianMonthName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {periodMonth > 0 && (
            <Select
              value={String(periodYear)}
              onValueChange={(v) => goToPage(1, { period: `${v}-${periodMonth}` })}
            >
              <SelectTrigger className="w-24" aria-label="Year (E.C.)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <TableSearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search sales…"
          />
        </div>
      </div>
      {periodMonth > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-line bg-surface-2 px-4 py-2.5 text-xs text-ink-soft">
          <span className="font-bold text-foreground">
            {ethiopianMonthName(periodMonth)} {periodYear} total
          </span>
          {periodTotals.data ? (
            <>
              <span>
                {periodTotals.data.receipts} receipt{periodTotals.data.receipts === 1 ? "" : "s"}
              </span>
              <span>
                Before VAT <span className="num font-semibold text-foreground">{formatMoney(periodTotals.data.beforeVat)} ETB</span>
              </span>
              <span>
                VAT <span className="num font-semibold text-foreground">{formatMoney(periodTotals.data.vat)} ETB</span>
              </span>
              <span>
                After VAT <span className="num text-sm font-bold text-foreground">{formatMoney(periodTotals.data.afterVat)} ETB</span>
              </span>
              <span className="text-ink-faint">Voided receipts excluded</span>
            </>
          ) : periodTotals.isError ? (
            <span className="text-critical">Couldn&apos;t load the month total.</span>
          ) : (
            <Loader2 className="h-3 w-3 animate-spin" aria-label="Loading month total" />
          )}
        </div>
      )}
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
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((sale) => {
              const totalAfterVat = sale.sale_items.reduce(
                (sum, item) => sum + item.value_after_vat,
                0,
              );
              const voided = !!sale.voided_at;
              return (
                <TableRow
                  key={sale.id}
                  className={`cursor-pointer ${voided ? "opacity-60" : ""}`}
                  onClick={() => setDetailSaleId(sale.id)}
                >
                  <TableCell className="font-semibold">
                    #{sale.vat_receipt_number}
                    {sale.review_status === "pending" && !voided && (
                      <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-bold text-warn">
                        Pending review
                      </span>
                    )}
                    {sale.review_status === "rejected" && !voided && (
                      <span
                        title={sale.review_note ?? undefined}
                        className="ml-2 rounded-full bg-critical-bg px-2 py-0.5 text-[11px] font-bold text-critical"
                      >
                        Rejected
                      </span>
                    )}
                    {voided && (
                      <span
                        title={sale.voided_reason ?? undefined}
                        className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft"
                      >
                        Voided
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatGregorianDate(sale.sale_date)}
                    <span className="ml-2 text-[11px] text-ink-faint">
                      {formatEthiopianDate(sale.sale_date)} E.C.
                    </span>
                  </TableCell>
                  <TableCell className="text-ink-soft">
                    {sale.buyer_name ?? "Walk-in customer"}
                  </TableCell>
                  <TableCell className="num text-right font-semibold">
                    {formatMoney(totalAfterVat)} ETB
                  </TableCell>
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <SaleRowActions sale={sale} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="py-20 text-center text-sm text-ink-soft"
                >
                  {urlSearch
                    ? `No results for "${urlSearch}".`
                    : periodMonth > 0
                      ? `No sales in ${ethiopianMonthName(periodMonth)} ${periodYear}.`
                      : review === "pending"
                        ? "Nothing waiting for review."
                        : review === "rejected"
                          ? "No rejected receipts."
                          : "No sales recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-xs text-ink-soft">
          {total === 0
            ? "No sales"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <PageButton
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage <= 1 || list.isFetching}
          >
            Previous
          </PageButton>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            {list.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            Page {safePage} of {totalPages}
          </span>
          <PageButton
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage >= totalPages || list.isFetching}
          >
            Next
          </PageButton>
        </div>
      </div>

      <SaleDetailDialog
        isAdmin={isAdmin}
        saleId={detailSaleId}
        open={detailSaleId !== null}
        onOpenChange={(open) => !open && setDetailSaleId(null)}
      />
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
