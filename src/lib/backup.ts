import { gunzipSync, gzipSync } from "node:zlib";
import { del, get, list, put } from "@vercel/blob";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Nightly off-site backup to a private Vercel Blob store — outside Supabase, so
 * losing the Supabase project doesn't take the backups with it. Each run writes
 * backups/vatflow-<timestamp>.json.gz with every table, keeps 30 days.
 *
 * It holds every shop's data, so only VatFlow's owners (OWNER_EMAILS) see it in
 * the app (/admin/backups) — never a shop's admins. Not covered: Supabase Auth accounts
 * (auth.users) — people would be re-invited after a full project loss; their
 * profiles and roles are in the dump.
 */

/** Parents before children, so a restore can insert in this order. */
const BACKUP_TABLES = ["shops", "profiles", "units", "products", "export_templates", "sales", "sale_items"] as const;

const RETENTION_DAYS = 30;
const PAGE = 1000; // PostgREST's default row cap per request

type Row = Record<string, unknown>;
type BackupFile = { version: 1; createdAt: string; tables: Record<string, Row[]> };

async function readTable(table: string) {
  const supabase = createAdminClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export type BackupSummary = { pathname: string; size: number; uploadedAt: string };

export function isBackupPath(pathname: string) {
  return /^backups\/vatflow-[\w-]+\.json\.gz$/.test(pathname);
}

async function listBackupBlobs() {
  const blobs: { pathname: string; size: number; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "backups/", cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

/** Dumps every table, checks the stored file reads back complete, then prunes old dumps. */
export async function runBackup() {
  const tables: Record<string, Row[]> = {};
  for (const table of BACKUP_TABLES) tables[table] = await readTable(table);

  const createdAt = new Date().toISOString();
  const file: BackupFile = { version: 1, createdAt, tables };
  const pathname = `backups/vatflow-${createdAt.replace(/[:.]/g, "-")}.json.gz`;
  const body = gzipSync(JSON.stringify(file));
  await put(pathname, body, { access: "private", addRandomSuffix: false, contentType: "application/gzip" });

  // Read it back and compare row counts, so a file that can't be opened fails
  // tonight's run instead of being discovered at restore time.
  const stored = await openBackup(pathname);
  if (!stored) throw new Error(`Backup ${pathname} could not be read back`);
  const check = JSON.parse(
    gunzipSync(Buffer.from(await new Response(stored).arrayBuffer())).toString("utf8"),
  ) as BackupFile;
  for (const table of BACKUP_TABLES) {
    if (check.tables[table]?.length !== tables[table].length) {
      throw new Error(`Backup ${pathname} failed verification (${table})`);
    }
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const expired = (await listBackupBlobs()).filter((b) => b.uploadedAt.getTime() < cutoff);
  if (expired.length > 0) await del(expired.map((b) => b.pathname));

  return {
    pathname,
    size: body.length,
    rows: Object.fromEntries(Object.entries(tables).map(([t, r]) => [t, r.length])),
    pruned: expired.length,
  };
}

/** Newest first. */
export async function listBackups(): Promise<BackupSummary[]> {
  return (await listBackupBlobs())
    .filter((b) => isBackupPath(b.pathname))
    .map((b) => ({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt.toISOString() }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Raw gzipped backup stream, or null if it isn't there. */
export async function openBackup(pathname: string) {
  const result = await get(pathname, { access: "private", useCache: false });
  return result?.statusCode === 200 ? result.stream : null;
}
