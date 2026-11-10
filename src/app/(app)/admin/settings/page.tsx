import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { ShopSettingsForm } from "@/components/shop-settings-form";

export default async function AdminSettingsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shop settings</h1>
        <p className="mt-0.5 text-sm text-ink-soft">Business details used on receipts and the VAT journal.</p>
      </div>

      <ShopSettingsForm shop={session.shop} />
    </div>
  );
}
