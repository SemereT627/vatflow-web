import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/**
 * Link to Kiln, the sibling stock-management app, for admins who run both.
 * Opens in a new tab so VatFlow stays open. Logo copied from kiln-web's
 * public/logo-192.png.
 */
export function KilnLink() {
  return (
    <a
      href="https://kiln.semere.app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Kiln (opens in a new tab)"
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="relative h-[17px] w-[17px] flex-none">
        <Image src="/brand/kiln-mark.png" alt="" fill sizes="17px" className="object-contain" />
      </span>
      <span className="flex-1">Kiln</span>
      <ArrowUpRight className="h-3.5 w-3.5 flex-none text-ink-faint" />
    </a>
  );
}
