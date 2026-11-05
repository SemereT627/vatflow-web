"use server";

import { getCurrentProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_DAYS } from "@/lib/device-trust";

/**
 * Updates the signed-in user's own display name. profiles has no UPDATE
 * policy (sellers are managed by admins), so this writes via the service
 * role — scoped to the caller's own row only.
 */
export async function updateOwnName(fullName: string) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not signed in.");

  const name = fullName.trim();
  if (!name) throw new Error("Name can't be empty.");
  if (name.length > 120) throw new Error("Name is too long.");

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ full_name: name })
    .eq("id", session.profile.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** Called right after two-step sign-in: trust this browser for 30 days (no
 * inactivity sign-out), or clear an earlier trust when the box is unticked. */
export async function setDeviceTrust(trust: boolean) {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Not signed in.");
  const store = await cookies();
  if (!trust) {
    store.delete(TRUSTED_DEVICE_COOKIE);
    return;
  }
  const maxAge = TRUSTED_DEVICE_DAYS * 24 * 60 * 60;
  store.set(TRUSTED_DEVICE_COOKIE, String(Date.now() + maxAge * 1000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
