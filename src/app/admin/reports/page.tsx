import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { ReportForm } from "@/components/report-form";

export default async function AdminReportsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/sales");

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-2 text-lg font-semibold text-gray-900">Monthly journal</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pick an Ethiopian month and download the XLSX in the Ministry of Revenue format.
      </p>
      <ReportForm />
    </div>
  );
}
