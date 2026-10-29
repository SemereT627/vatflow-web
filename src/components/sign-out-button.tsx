"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full page load, not router.push + refresh: those race, and the client
    // router cache can keep showing the signed-in screens after sign-out.
    window.location.assign("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      title="Sign out"
      className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-ink-soft hover:bg-surface-2 hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    </button>
  );
}
