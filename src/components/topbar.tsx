import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentProfile } from "@/lib/session";
import { pendingReviewCount } from "@/lib/review";
import { ethiopianMonthName, gregorianToEthiopian } from "@/lib/ethiopian";
import { addisTodayIso, formatGregorianDate } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { UserMenu } from "@/components/user-menu";
import { HeaderSearch, RangeSelect } from "@/components/header-controls";

/** The reference's header row: shop and date on the left; search, range, alerts and account on the right. */
export async function Topbar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const isAdmin = session.profile.role === "admin";
  const pending = isAdmin ? await pendingReviewCount(session.shop.id) : 0;
  const today = addisTodayIso();
  const ec = gregorianToEthiopian(today);

  return (
    <header className="sticky top-0 z-10 flex flex-none items-center justify-between gap-3 bg-background/85 px-4 py-4 backdrop-blur-md md:px-8 md:py-5">
      <div className="min-w-0">
        <p className="truncate text-xl font-semibold tracking-tight">{session.shop.business_name}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">
          Ledger &amp; VAT desk · {ethiopianMonthName(ec.month)} {ec.day}, {ec.year} E.C. · {formatGregorianDate(today)}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2.5">
        <HeaderSearch />
        <Suspense>
          <RangeSelect />
        </Suspense>
        {isAdmin && (
          <Link
            href="/sales?review=pending"
            aria-label={pending ? `${pending} receipts pending review` : "No receipts pending review"}
            title={pending ? `${pending} receipts pending review` : "No receipts pending review"}
            className="relative flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Bell className="size-4" />
            {pending > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-brand ring-2 ring-surface" />}
          </Link>
        )}
        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
        <UserMenu variant="avatar" fullName={session.profile.full_name} role={session.profile.role} email={session.email} />
      </div>
    </header>
  );
}
