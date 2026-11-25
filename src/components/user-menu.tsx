"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Account menu: profile, shop settings for admins, and sign out. `avatar` is
 * the header's initials tile; `card` is the row in the mobile menu.
 */
export function UserMenu({
  fullName,
  role,
  email,
  variant = "card",
  onNavigate,
}: {
  fullName: string;
  role: "admin" | "seller" | string;
  /** Shown under the name; falls back to the role. */
  email?: string | null;
  variant?: "card" | "avatar";
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

  const subtitle = (
    <div className={`mt-0.5 truncate text-[11px] text-ink-soft ${email ? "" : "capitalize"}`}>{email ?? role}</div>
  );

  return (
    <DropdownMenu>
      {variant === "avatar" ? (
        <DropdownMenuTrigger
          aria-label={`Account menu for ${fullName}`}
          className="flex size-10 flex-none items-center justify-center rounded-xl border border-line bg-surface text-[13px] font-semibold outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:bg-surface-2"
        >
          {initials}
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:bg-surface-2"
          aria-label={`Account menu for ${fullName}`}
        >
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand ring-1 ring-brand/15">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{fullName}</div>
            {subtitle}
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 flex-none text-ink-soft" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={variant === "avatar" ? "bottom" : "top"}
        align={variant === "avatar" ? "end" : "start"}
        className={variant === "avatar" ? "w-56" : "w-[var(--radix-dropdown-menu-trigger-width)]"}
      >
        {variant === "avatar" && (
          <div className="px-2.5 pt-1.5 pb-2">
            <div className="truncate text-sm font-semibold">{fullName}</div>
            {subtitle}
          </div>
        )}
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
