import { getCurrentProfile } from "@/lib/session";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function Topbar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-6 py-3 backdrop-blur-sm md:px-10">
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{session.shop.business_name}</div>
        <div className="text-[11px] text-ink-soft">{formatEthiopianDate(new Date())} E.C.</div>
      </div>
      <div className="flex flex-none items-center gap-2">
        <LocaleSwitcher />
      </div>
    </header>
  );
}
