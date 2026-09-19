"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  PRODUCTS_PAGE_SIZE,
  fetchProductsPage,
  fetchProductsStats,
  productsListKey,
  productsStatsKey,
  type ProductRow,
} from "@/lib/products-query";
import type { Unit } from "@/lib/types";
import { ProductStatusToggle, ProductActions } from "@/components/product-row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const requestedPage = parseInt(searchParams.get("page") ?? String(initialPage), 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;

  const stats = useQuery({
    queryKey: productsStatsKey(shopId),
    queryFn: () => fetchProductsStats(shopId),
    initialData: { total: initialTotal, activeCount: initialActiveCount },
  });

  const list = useQuery({
    queryKey: productsListKey(shopId, page),
    queryFn: () => fetchProductsPage(shopId, page),
    placeholderData: keepPreviousData,
    initialData: page === initialPage ? { rows: initialRows } : undefined,
  });

  const total = stats.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = list.data?.rows ?? [];
  const from = (safePage - 1) * PRODUCTS_PAGE_SIZE;
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + rows.length, total);

  function goToPage(next: number) {
    router.push(`/admin/products?page=${next}`, { scroll: false });
  }

  return (
    <>
      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
        <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${list.isFetching ? "opacity-60" : ""}`}>
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
                  <TableCell className="num text-ink-soft">{p.machine_code ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="text-ink-soft">{p.units?.short_code ?? "—"}</TableCell>
                  <TableCell className="num text-right">{p.unit_price_before_vat.toFixed(2)} ETB</TableCell>
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
                    <p className="text-sm font-semibold">No products yet</p>
                    <p className="mt-1 text-sm text-ink-soft">Add your first item above.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-xs text-ink-soft">
            {total === 0 ? "No products" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
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
