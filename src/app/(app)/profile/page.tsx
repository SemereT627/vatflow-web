import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile-view";

export default async function ProfilePage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-4 py-6 sm:px-6 md:px-10">
      {/* Centred column, matching Kiln's profile page */}
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Profile</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Your account, password, two-step sign-in and sessions.
          </p>
        </div>

        <ProfileView
          fullName={session.profile.full_name}
          role={session.profile.role}
          shopName={session.shop.business_name}
          email={user.email ?? ""}
          createdAt={user.created_at}
          lastSignInAt={user.last_sign_in_at ?? null}
        />
      </div>
    </div>
  );
}
