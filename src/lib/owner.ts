/**
 * The people who run VatFlow itself (OWNER_EMAILS, comma-separated), as opposed
 * to a shop's admins. Only they see data that spans every shop, e.g. backups.
 */
export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const owners = (process.env.OWNER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return owners.includes(email.toLowerCase());
}
