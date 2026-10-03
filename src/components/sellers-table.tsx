"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { SELLERS_PAGE_SIZE, fetchSellersPage, sellersListKey, type SellerRow } from "@/lib/sellers-query";
import { SellerRowActions } from "@/components/seller-row-actions";
import { TableSearchInput } from "@/components/table-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SellersTable({
  initialPage,
  initialRows,
  initialTotal,
}: {
  initialPage: number;
  initialRows: SellerRow[];
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

  function goToPage(next: number, nextSearch: string = urlSearch) {
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    params.set("page", String(next));
    router.push(`/admin/sellers?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (search !== urlSearch) goToPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const list = useQuery({
    queryKey: sellersListKey(page, urlSearch),
    queryFn: () => fetchSellersPage(page, urlSearch),
    placeholderData: keepPreviousData,
    initialData: page === initialPage && !urlSearch ? { rows: initialRows, total: initialTotal } : undefined,
  });

  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / SELLERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = list.data?.rows ?? [];
  const from = (safePage - 1) * SELLERS_PAGE_SIZE;
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + rows.length, total);

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center border-b border-line px-4 py-3">
        <TableSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search sellers…" />
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${list.isFetching ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Added</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.full_name}</TableCell>
                <TableCell className="text-ink-soft">{s.email}</TableCell>
                <TableCell>
                  {s.banned ? (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                      Deactivated
                    </span>
                  ) : (
                    <span className="rounded-full bg-good-bg px-2 py-0.5 text-[11px] font-bold text-good">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="num text-right text-ink-soft">
                  {new Date(s.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <SellerRowActions sellerId={s.id} fullName={s.full_name} isBanned={s.banned} hasSales={s.hasSales} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-20 text-center">
                  {urlSearch ? (
                    <p className="text-sm text-ink-soft">No results for &quot;{urlSearch}&quot;.</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">No sellers yet</p>
                      <p className="mt-1 text-sm text-ink-soft">Add your first one above.</p>
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
          {total === 0 ? "No sellers" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
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
