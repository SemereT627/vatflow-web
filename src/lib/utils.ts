import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Escapes %, _, and \ so a user's search term is safe inside a Postgres ILIKE pattern. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Formats a monetary amount with thousands separators and 2 decimals, e.g. 177231.73 -> "177,231.73". */
export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Today's ISO date in Addis Ababa (UTC+3, no DST), whatever the server's or browser's timezone. */
export function addisTodayIso(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Formats an ISO date as a short Gregorian label, e.g. "2026-10-30" -> "Oct 30, 2026". */
export function formatGregorianDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats an integer count with thousands separators, e.g. 12345 -> "12,345". */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
