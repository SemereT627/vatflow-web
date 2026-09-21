import Image from "next/image";
import { getCurrentProfile } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks, type NavGroup } from "@/components/nav-links";
import { MobileNav } from "@/components/mobile-nav";

const ICONS: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="7" width="4" height="14" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  ),
  Products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
    </svg>
  ),
  Sales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16l-1.5 9h-13z" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  ),
  Reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  ),
  Sellers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c1-3.5 3.6-5.4 6.5-5.4s5.5 1.9 6.5 5.4" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M16 14.6c2 .2 3.7 1.7 4.5 4.4" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

export async function Sidebar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const groupDefs: { label: string | null; items: { href: string; label: string }[] }[] =
    session.profile.role === "admin"
      ? [
          { label: null, items: [{ href: "/admin/dashboard", label: "Dashboard" }] },
          { label: "Catalog", items: [{ href: "/admin/products", label: "Products" }] },
          { label: "Sales", items: [{ href: "/sales", label: "Sales" }] },
          {
            label: "Administration",
            items: [
              { href: "/admin/sellers", label: "Sellers" },
              { href: "/admin/reports", label: "Reports" },
              { href: "/admin/settings", label: "Settings" },
            ],
          },
        ]
      : [{ label: null, items: [{ href: "/sales", label: "Sales" }] }];

  const initials = session.profile.full_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const groups: NavGroup[] = groupDefs.map((g) => ({
    label: g.label,
    items: g.items.map((l) => ({ ...l, icon: ICONS[l.label] })),
  }));

  return (
    <>
      <MobileNav groups={groups} fullName={session.profile.full_name} role={session.profile.role} />

      <aside className="hidden flex-none flex-col gap-6 overflow-y-auto border-line bg-surface px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-56 md:border-r">
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative h-8 w-8 flex-none">
            <Image src="/brand/mark.png" alt="VatFlow" fill sizes="32px" className="object-contain" />
          </div>
          <div>
            <div className="font-heading text-base font-bold leading-none">VatFlow</div>
            <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
          </div>
        </div>

        <NavLinks groups={groups} />

        <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-line bg-background p-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-2 font-heading text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold">{session.profile.full_name}</div>
            <div className="text-[11px] capitalize text-ink-soft">{session.profile.role}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
