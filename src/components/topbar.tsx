import { getCurrentProfile } from "@/lib/session";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function Topbar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  return (
    <header className="sticky top-0 z-10 flex h-14 flex-none items-center justify-between gap-3 border-b border-line bg-background/80 px-4 backdrop-blur-md">
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
