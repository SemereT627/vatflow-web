import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { getSellersPage } from "@/lib/sellers-server";
import { SellerForm } from "@/components/seller-form";
import { SellersTable } from "@/components/sellers-table";

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  const requestedPage = parseInt((await searchParams).page ?? "1", 10);
  const page = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const { rows, total } = await getSellersPage(session.shop.id, page);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sellers</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {total} seller{total === 1 ? "" : "s"} can record sales for this shop
          </p>
        </div>
        <SellerForm />
      </div>

      <SellersTable initialPage={page} initialRows={rows} initialTotal={total} />
    </div>
  );
}
