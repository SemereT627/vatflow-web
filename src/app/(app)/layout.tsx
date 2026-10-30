import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { SessionTimeout } from "@/components/session-timeout";

// The signed-in shell lives here, not in the root layout, so /login never
// renders it — a root-layout shell persists across client navigations and
// could linger on the login screen after signing out.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar />
        {children}
      </div>
      <SessionTimeout />
    </div>
  );
}
