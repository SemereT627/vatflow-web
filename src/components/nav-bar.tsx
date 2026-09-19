import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export async function NavBar() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const links =
    session.profile.role === "admin"
      ? [
          { href: "/admin/products", label: "Products" },
          { href: "/sales", label: "Sales" },
          { href: "/admin/reports", label: "Reports" },
        ]
      : [
          { href: "/sales/new", label: "New sale" },
          { href: "/sales", label: "History" },
        ];

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">VatFlow</span>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-gray-500 hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
