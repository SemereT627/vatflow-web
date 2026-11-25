import type { ReactNode } from "react";

// Shared by the server Sidebar and the client RailLinks, so no "use client" here.

/** 40px rail tile: lime tint when active, a hover label to the right. */
export function railTileClass(active: boolean) {
  return `group/tile relative flex size-10 flex-none items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-brand [&_svg]:size-[18px] ${
    active
      ? "border-brand/15 bg-brand/15 text-brand"
      : "border-line bg-surface-2/70 text-ink-soft hover:bg-surface-2 hover:text-foreground"
  }`;
}

export function RailTooltip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 -translate-y-1/2 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-medium whitespace-nowrap text-foreground opacity-0 shadow-lg transition-opacity group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
      {children}
    </span>
  );
}
