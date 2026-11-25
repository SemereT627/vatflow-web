import Image from "next/image";
import Link from "next/link";
import { DatabaseBackup, FileText, LayoutGrid, Package, SlidersHorizontal, TrendingUp, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/session";
import { pendingReviewCount } from "@/lib/review";
import { RailLinks, type NavGroup } from "@/components/nav-links";
import { RailTooltip, railTileClass } from "@/components/rail-tile";
import { MobileNav } from "@/components/mobile-nav";
import { isOwner } from "@/lib/owner";

/**
 * Desktop: the reference's 72px icon rail (logo, page tiles, Kiln and
 * Settings at the foot). Mobile: the drawer menu.
 */
export async function Sidebar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const isAdmin = session.profile.role === "admin";
  const pending = isAdmin ? await pendingReviewCount(session.shop.id) : 0;

  const groups: NavGroup[] = isAdmin
    ? [
        { label: null, items: [{ href: "/admin/dashboard", label: "Dashboard", icon: <LayoutGrid /> }] },
        { label: "Sales", items: [{ href: "/sales", label: "Sales", icon: <TrendingUp />, badge: pending }] },
        { label: "Catalog", items: [{ href: "/admin/products", label: "Products", icon: <Package /> }] },
        {
          label: "Administration",
          divider: true,
          items: [
            { href: "/admin/sellers", label: "Sellers", icon: <Users /> },
            { href: "/admin/reports", label: "Reports", icon: <FileText /> },
            ...(isOwner(session.email) ? [{ href: "/admin/backups", label: "Backups", icon: <DatabaseBackup /> }] : []),
            { href: "/admin/settings", label: "Settings", icon: <SlidersHorizontal /> },
          ],
        },
      ]
    : [{ label: null, items: [{ href: "/sales", label: "Sales", icon: <TrendingUp /> }] }];

  const items = groups.flatMap((g) => g.items);
  const settings = items.find((l) => l.href === "/admin/settings");
  const main = items.filter((l) => l !== settings);

  return (
    <>
      <MobileNav groups={groups} fullName={session.profile.full_name} role={session.profile.role} />

      <aside className="hidden w-[72px] flex-none flex-col items-center gap-4 border-r border-line bg-background py-5 md:sticky md:top-0 md:flex md:h-screen">
        <Link
          href={isAdmin ? "/admin/dashboard" : "/sales"}
          aria-label="VatFlow home"
          className="mb-4 flex size-10 flex-none items-center justify-center rounded-xl border border-line bg-surface-2"
        >
          <span className="relative size-6">
            <Image src="/brand/mark.png" alt="" fill sizes="24px" className="object-contain" />
          </span>
        </Link>

        <nav aria-label="Main" className="flex flex-col items-center gap-4">
          <RailLinks items={main} />
        </nav>

        <div className="mt-auto flex flex-col items-center gap-4">
          {isAdmin && (
            <a
              href="https://kiln.semere.app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kiln (opens in a new tab)"
              className={railTileClass(false)}
            >
              <span className="relative size-[18px]">
                <Image src="/brand/kiln-mark.png" alt="" fill sizes="18px" className="object-contain" />
              </span>
              <RailTooltip>Kiln</RailTooltip>
            </a>
          )}
          {settings && <RailLinks items={[settings]} />}
        </div>
      </aside>
    </>
  );
}
