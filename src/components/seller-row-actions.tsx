"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2 } from "lucide-react";
import { deleteSeller, resetSellerMfa, setSellerBanned } from "@/app/actions/sellers";
import { SELLERS_QUERY_PREFIX } from "@/lib/sellers-query";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  const [confirming, setConfirming] = useState<"reset" | "delete" | null>(null);

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
      setConfirming(null);
    }
  }

  async function handleResetMfa() {
    setPending(true);
    setError(null);
    try {
      await resetSellerMfa(sellerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset two-step sign-in.");
    } finally {
      setPending(false);
      setConfirming(null);
    }
  }

  async function handleDelete() {
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
      setConfirming(null);
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
          disabled={pending}
          title="Reset two-step sign-in"
          aria-label={`Reset two-step sign-in for ${fullName}`}
          onClick={() => setConfirming("reset")}
        >
          <KeyRound className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending || hasSales}
          title={hasSales ? "Has recorded sales — deactivate instead" : "Remove seller"}
          onClick={() => setConfirming("delete")}
        >
          <Trash2 className="h-3.5 w-3.5 text-critical" />
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-critical">{error}</p>}

      <ConfirmDialog
        open={confirming === "reset"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Reset two-step sign-in for ${fullName}?`}
        description="Their authenticator is removed. They'll set up a new one the next time they sign in on the web."
        confirmLabel="Reset"
        pendingLabel="Resetting…"
        pending={pending}
        onConfirm={handleResetMfa}
      />
      <ConfirmDialog
        open={confirming === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Remove ${fullName}?`}
        description="Their account is deleted and they lose access immediately. This can't be undone."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={pending}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
