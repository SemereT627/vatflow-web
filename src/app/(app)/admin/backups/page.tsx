import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentProfile } from "@/lib/session";
import { isOwner } from "@/lib/owner";
import { listBackups, type BackupSummary } from "@/lib/backup";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { BackUpNowButton } from "@/components/back-up-now-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// "Back up now" runs the full backup inside this page's server action.
export const maxDuration = 300;

// A nightly run that didn't happen shows up here as a stale latest backup.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

function isStale(latest: BackupSummary | undefined) {
  return !latest || Date.now() - Date.parse(latest.uploadedAt) > STALE_AFTER_MS;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function addisDateTime(iso: string) {
  const addisDay = new Date(Date.parse(iso) + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const time = new Date(iso).toLocaleString("en-US", {
    timeZone: "Africa/Addis_Ababa",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return { time, ec: formatEthiopianDate(addisDay) };
}

export default async function BackupsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (!isOwner(session.email)) redirect("/");

  let backups: BackupSummary[] = [];
  let loadError = false;
  try {
    backups = await listBackups();
  } catch (error) {
    console.error("List backups failed:", error);
    loadError = true;
  }
  const latest = backups[0];
  const stale = !loadError && isStale(latest);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Backups</h1>
          <p className="mt-0.5 max-w-xl text-sm text-ink-soft">
            Every night at 03:00 every table is saved to a private Vercel Blob store, outside Supabase. Kept 30 days.
            Holds every shop&apos;s data, so only VatFlow owners see this page. Login accounts aren&apos;t included.
          </p>
        </div>
        <BackUpNowButton />
      </div>

      {loadError && (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical-bg px-3 py-2.5 text-sm text-critical">
          Couldn&apos;t reach the backup store. Check BLOB_READ_WRITE_TOKEN in Vercel.
        </p>
      )}
      {stale && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn-bg px-3 py-2.5 text-sm text-warn">
          {latest
            ? "The latest backup is more than 36 hours old — the nightly run may be failing. Check Cron Jobs in Vercel."
            : "No backups yet. Run one now, or wait for tonight's run."}
        </p>
      )}

      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Taken (Addis)</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((b) => {
              const { time, ec } = addisDateTime(b.uploadedAt);
              return (
                <TableRow key={b.pathname}>
                  <TableCell>
                    {time}
                    <span className="ml-2 text-[11px] text-ink-faint">{ec} E.C.</span>
                  </TableCell>
                  <TableCell className="num text-right">{formatSize(b.size)}</TableCell>
                  <TableCell className="text-right">
                    <a
                      href={`/api/admin/backups/download?path=${encodeURIComponent(b.pathname)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
            {backups.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="py-16 text-center text-sm text-ink-soft">
                  No backups yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
