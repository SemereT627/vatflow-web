"use client";

import { PanelLeft } from "lucide-react";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

/**
 * Collapses the desktop sidebar to an icon rail. Flips data-collapsed on the
 * <aside> (all hiding is CSS) and remembers it in a cookie the server reads,
 * so a reload renders the same state without a flash.
 */
export function SidebarToggle() {
  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const aside = e.currentTarget.closest("aside");
    if (!aside) return;
    const collapsed = aside.dataset.collapsed !== "true";
    aside.dataset.collapsed = String(collapsed);
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Collapse or expand the sidebar"
      title="Collapse or expand the sidebar"
      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}
