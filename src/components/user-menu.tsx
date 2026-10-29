"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * The account card at the bottom of the sidebar (and mobile menu). The whole
 * card opens a menu: profile, shop settings for admins, and sign out.
 */
export function UserMenu({
  fullName,
  role,
  onNavigate,
}: {
  fullName: string;
  role: "admin" | "seller" | string;
  /** Called before navigating — the mobile menu uses it to close itself. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const initials = fullName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function go(href: string) {
    onNavigate?.();
    router.push(href);
  }

  async function signOut() {
    await createClient().auth.signOut();
    // Full page load, not router.push + refresh: those race, and the client
    // router cache can keep showing the signed-in screens after sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard reload
    window.location.assign("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-background p-3 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:bg-surface-2"
        aria-label={`Account menu for ${fullName}`}
      >
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-2 font-heading text-xs font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold">{fullName}</div>
          <div className="text-[11px] capitalize text-ink-soft">{role}</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 flex-none text-ink-soft" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem onSelect={() => go("/profile")}>
          <UserRound />
          Profile
        </DropdownMenuItem>
        {role === "admin" && (
          <DropdownMenuItem onSelect={() => go("/admin/settings")}>
            <Settings />
            Shop settings
          </DropdownMenuItem>
        )}
        <div className="my-1 h-px bg-line" role="separator" />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
