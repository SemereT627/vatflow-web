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

  const groupDefs: { label: string | null; divider?: boolean; items: { href: string; label: string; badge?: number }[] }[] =
    session.profile.role === "admin"
      ? [
          { label: null, items: [{ href: "/admin/dashboard", label: "Dashboard" }] },
          { label: "Catalog", items: [{ href: "/admin/products", label: "Products" }] },
          { label: "Sales", items: [{ href: "/sales", label: "Sales", badge: pendingReview }] },
          {
            label: "Administration",
            divider: true,
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
    divider: g.divider,
    items: g.items.map((l) => ({ ...l, icon: ICONS[l.label] })),
  }));

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <>
      <MobileNav groups={groups} fullName={session.profile.full_name} role={session.profile.role} />

      <aside
        data-collapsed={collapsed}
        className="group/sidebar hidden flex-none flex-col overflow-x-hidden border-line bg-background transition-[width] md:sticky md:top-0 md:flex md:h-screen md:w-64 md:border-r md:data-[collapsed=true]:w-12"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 group-data-[collapsed=true]/sidebar:flex-col-reverse group-data-[collapsed=true]/sidebar:gap-6 group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:pt-6">
          <div className="flex items-center gap-2.5">
            <div className="relative size-7 flex-none">
              <Image src="/brand/mark.png" alt="VatFlow" fill sizes="28px" className="object-contain" />
            </div>
            <p className="text-xl leading-tight font-bold tracking-tight group-data-[collapsed=true]/sidebar:hidden">VatFlow</p>
          </div>
          <SidebarToggle />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 group-data-[collapsed=true]/sidebar:px-0">
          <NavLinks groups={groups} />
          {session.profile.role === "admin" && (
            <div className="mt-auto py-1.5">
              <KilnLink />
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-line py-3 group-data-[collapsed=true]/sidebar:mx-1 group-data-[collapsed=true]/sidebar:py-2">
          <UserMenu fullName={session.profile.full_name} role={session.profile.role} email={session.email} />
        </div>
      </aside>
    </>
  );
}
