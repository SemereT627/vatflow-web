import { getCurrentProfile } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/nav-links";

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
};

export async function Sidebar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const links =
    session.profile.role === "admin"
      ? [
          { href: "/admin/dashboard", label: "Dashboard" },
          { href: "/admin/products", label: "Products" },
          { href: "/sales", label: "Sales" },
          { href: "/admin/reports", label: "Reports" },
        ]
      : [{ href: "/sales", label: "Sales" }];

  const initials = session.profile.full_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex flex-none flex-col gap-4 overflow-y-auto border-b border-line bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:gap-6 md:border-b-0 md:border-r md:py-6">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand font-heading text-sm font-bold text-brand-ink">
          VF
        </div>
        <div className="hidden md:block">
          <div className="font-heading text-base font-bold leading-none">VatFlow</div>
          <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
        </div>
      </div>

      <NavLinks links={links.map((l) => ({ ...l, icon: ICONS[l.label] }))} />

      <div className="hidden items-center gap-2.5 rounded-xl border border-line bg-background p-3 md:mt-auto md:flex">
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
  );
}
