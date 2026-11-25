import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/**
 * Link to Kiln, the sibling stock-management app, for admins who run both.
 * Opens in a new tab so VatFlow stays open. Logo copied from kiln-web's
 * public/logo-192.png. The desktop rail has its own Kiln tile.
 */
export function KilnLink() {
  return (
    <a
      href="https://kiln.semere.app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Kiln (opens in a new tab)"
      title="Kiln"
      className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="relative size-4 flex-none">
        <Image src="/brand/kiln-mark.png" alt="" fill sizes="16px" className="object-contain" />
      </span>
      <span className="min-w-0 truncate">Kiln</span>
      <ArrowUpRight className="ml-auto size-3.5 flex-none text-ink-faint" />
    </a>
  );
}
