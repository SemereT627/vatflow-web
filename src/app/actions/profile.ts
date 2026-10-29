"use server";

import { getCurrentProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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
