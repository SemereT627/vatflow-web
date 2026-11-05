import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { cookies } from "next/headers";
import { SessionTimeout } from "@/components/session-timeout";
import { TRUSTED_DEVICE_COOKIE, isTrustedDevice } from "@/lib/device-trust";

// The signed-in shell lives here, not in the root layout, so /login never
// renders it — a root-layout shell persists across client navigations and
// could linger on the login screen after signing out.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const trusted = isTrustedDevice((await cookies()).get(TRUSTED_DEVICE_COOKIE)?.value);
  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar />
        {children}
      </div>
      {!trusted && <SessionTimeout />}
    </div>
  );
}
