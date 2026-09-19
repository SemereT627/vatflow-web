"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { deleteSeller, setSellerBanned } from "@/app/actions/sellers";
import { SELLERS_QUERY_PREFIX } from "@/lib/sellers-query";
import { Button } from "@/components/ui/button";

export function SellerRowActions({
  sellerId,
  fullName,
  isBanned,
  hasSales,
}: {
  sellerId: string;
  fullName: string;
  isBanned: boolean;
  hasSales: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBanned() {
    setPending(true);
    setError(null);
    try {
      await setSellerBanned(sellerId, !isBanned);
      queryClient.invalidateQueries({ queryKey: SELLERS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update seller.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${fullName}? This can't be undone.`)) return;
    setPending(true);
    setError(null);
    try {
      await deleteSeller(sellerId);
      queryClient.invalidateQueries({ queryKey: SELLERS_QUERY_PREFIX });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove seller.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={toggleBanned}>
          {isBanned ? "Reactivate" : "Deactivate"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending || hasSales}
          title={hasSales ? "Has recorded sales — deactivate instead" : "Remove seller"}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5 text-critical" />
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-critical">{error}</p>}
    </div>
  );
}
