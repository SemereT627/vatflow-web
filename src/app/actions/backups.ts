"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/session";
import { isOwner } from "@/lib/owner";
import { runBackup } from "@/lib/backup";

/** "Back up now" on /admin/backups — owners only, same run as the nightly cron. */
export async function backUpNow() {
  const session = await getCurrentProfile();
  if (!session || !isOwner(session.email)) throw new Error("Not allowed.");
  try {
    await runBackup();
  } catch (error) {
    console.error("Manual backup failed:", error);
    throw new Error("Backup failed. Check the function logs in Vercel.");
  }
  revalidatePath("/admin/backups");
}
