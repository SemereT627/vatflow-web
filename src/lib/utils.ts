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

/** Formats an integer count with thousands separators, e.g. 12345 -> "12,345". */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
