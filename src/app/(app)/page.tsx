import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";

export default async function Home() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  redirect(session.profile.role === "admin" ? "/admin/dashboard" : "/sales");
}
