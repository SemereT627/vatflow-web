import Image from "next/image";
import { DatabaseBackup, FileSpreadsheet, LayoutDashboard, Package, Settings, ShoppingCart, Users } from "lucide-react";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { KilnLink } from "@/components/kiln-link";
import { NavLinks, type NavGroup } from "@/components/nav-links";
import { MobileNav } from "@/components/mobile-nav";
import { isOwner } from "@/lib/owner";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

// Same lucide set as Kiln's sidebar (components/nav-config.ts there).
const ICONS: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard />,
  Products: <Package />,
  Sales: <ShoppingCart />,
  Reports: <FileSpreadsheet />,
  Sellers: <Users />,
  Settings: <Settings />,
  Backups: <DatabaseBackup />,
};

export async function Sidebar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  // Mobile receipts waiting for an admin's review — shown on the Sales link.
  let pendingReview = 0;
  if (session.profile.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", session.shop.id)
      .eq("review_status", "pending");
    pendingReview = count ?? 0;
  }

  const groupDefs: { label: string | null; items: { href: string; label: string; badge?: number }[] }[] =
    session.profile.role === "admin"
      ? [
          { label: null, items: [{ href: "/admin/dashboard", label: "Dashboard" }] },
          { label: "Catalog", items: [{ href: "/admin/products", label: "Products" }] },
          { label: "Sales", items: [{ href: "/sales", label: "Sales", badge: pendingReview }] },
          {
            label: "Administration",
            items: [
              { href: "/admin/sellers", label: "Sellers" },
              { href: "/admin/reports", label: "Reports" },
              { href: "/admin/settings", label: "Settings" },
              ...(isOwner(session.email) ? [{ href: "/admin/backups", label: "Backups" }] : []),
            ],
          },
        ]
      : [{ label: null, items: [{ href: "/sales", label: "Sales" }] }];


  const groups: NavGroup[] = groupDefs.map((g) => ({
    label: g.label,
    items: g.items.map((l) => ({ ...l, icon: ICONS[l.label] })),
  }));

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <>
      <MobileNav groups={groups} fullName={session.profile.full_name} role={session.profile.role} />

      <aside
        data-collapsed={collapsed}
        className="group/sidebar hidden flex-none flex-col gap-6 overflow-y-auto overflow-x-hidden border-line bg-background px-4 py-6 transition-[width] md:sticky md:top-0 md:flex md:h-screen md:w-64 md:border-r data-[collapsed=true]:px-3 md:data-[collapsed=true]:w-[4.5rem]"
      >
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsed=true]/sidebar:flex-col-reverse group-data-[collapsed=true]/sidebar:gap-3 group-data-[collapsed=true]/sidebar:px-0">
          <div className="relative h-8 w-8 flex-none group-data-[collapsed=true]/sidebar:h-6 group-data-[collapsed=true]/sidebar:w-6">
            <Image src="/brand/mark.png" alt="VatFlow" fill sizes="32px" className="object-contain" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsed=true]/sidebar:hidden">
            <div className="font-heading text-base font-bold leading-none">VatFlow</div>
            <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
          </div>
          <SidebarToggle />
        </div>

        <NavLinks groups={groups} />

        <div className="mt-auto space-y-2">
          {session.profile.role === "admin" && <KilnLink />}
          <UserMenu fullName={session.profile.full_name} role={session.profile.role} />
        </div>
      </aside>
    </>
  );
}
