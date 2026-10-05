"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useFillPageSize } from "@/hooks/use-fill-page-size";
import {
  PRODUCTS_PAGE_SIZE,
  fetchProductsPage,
  fetchProductsStats,
  productsListKey,
  productsStatsKey,
  type ProductRow,
} from "@/lib/products-query";
import type { Unit } from "@/lib/types";
import {
  ProductStatusToggle,
  ProductActions,
} from "@/components/product-row-actions";
import { TableSearchInput } from "@/components/table-search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProductsTable({
  shopId,
  units,
  initialPage,
  initialRows,
  initialTotal,
  initialActiveCount,
}: {
  shopId: string;
  units: Unit[];
  initialPage: number;
  initialRows: ProductRow[];
  initialTotal: number;
  initialActiveCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = parseInt(
    searchParams.get("page") ?? String(initialPage),
    10,
  );
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const urlSearch = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const search = useDebounce(searchInput, 300);
  const { containerRef, pageSize } = useFillPageSize(PRODUCTS_PAGE_SIZE);

  function goToPage(next: number, nextSearch: string = urlSearch) {
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    params.set("page", String(next));
    router.push(`/admin/products?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (search !== urlSearch) goToPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stats = useQuery({
    queryKey: productsStatsKey(shopId, urlSearch),
    queryFn: () => fetchProductsStats(shopId, urlSearch),
    initialData: urlSearch
      ? undefined
      : { total: initialTotal, activeCount: initialActiveCount },
  });

  const list = useQuery({
    queryKey: productsListKey(shopId, page, urlSearch, pageSize),
    queryFn: () => fetchProductsPage(shopId, page, urlSearch, pageSize),
    placeholderData: keepPreviousData,
    initialData:
      page === initialPage && !urlSearch && pageSize === PRODUCTS_PAGE_SIZE
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
    <>
      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center border-b border-line px-4 py-3">
          <TableSearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search products…"
          />
        </div>
        <div
          ref={containerRef}
          className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${list.isFetching ? "opacity-60" : ""}`}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price (before VAT)</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="num text-ink-soft">
                    {p.machine_code ?? "—"}
                  </TableCell>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="text-ink-soft">
                    {p.units?.short_code ?? "—"}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatMoney(p.unit_price_before_vat)} ETB
                  </TableCell>
                  <TableCell>
                    <ProductStatusToggle product={p} />
                  </TableCell>
                  <TableCell>
                    <ProductActions product={p} units={units} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-20 text-center">
                    {urlSearch ? (
                      <p className="text-sm text-ink-soft">
                        No results for &quot;{urlSearch}&quot;.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">No products yet</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          Add your first item above.
                        </p>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-xs text-ink-soft">
            {total === 0
              ? "No products"
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
      </div>
    </>
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
