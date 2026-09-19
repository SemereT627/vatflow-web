import { toEC, toGC, monthNames } from "kenat";

export type EthiopianDate = { year: number; month: number; day: number };

/** Convert a Gregorian JS Date (or ISO date string) to Ethiopian calendar. */
export function gregorianToEthiopian(date: Date | string): EthiopianDate {
  const d = typeof date === "string" ? new Date(date) : date;
  return toEC(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function ethiopianMonthName(month: number): string {
  return monthNames.english[month - 1];
}

/** Format as dd/mm/yyyy in the Ethiopian calendar, matching the Ministry template. */
export function formatEthiopianDate(date: Date | string): string {
  const { year, month, day } = gregorianToEthiopian(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(day)}/${pad(month)}/${year}`;
}

/** Label used for journal titles, e.g. "Tadelech Sales Hamle 2018". */
export function journalTitle(ownerName: string, month: number, year: number): string {
  return `${ownerName} Sales ${ethiopianMonthName(month)} ${year}`;
}

function toIsoDate({ year, month, day }: { year: number; month: number; day: number }): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Gregorian [start, end] ISO date bounds (inclusive) covering one Ethiopian month.
 * Computed by converting the start of the *next* Ethiopian month and stepping back a day,
 * so it works for Pagume (5 or 6 days) without hardcoding month lengths.
 */
export function ethiopianMonthRange(year: number, month: number): { start: string; end: string } {
  const start = toGC(year, month, 1);
  const nextMonth = month === 13 ? 1 : month + 1;
  const nextYear = month === 13 ? year + 1 : year;
  const nextStart = toGC(nextYear, nextMonth, 1);

  const endDate = new Date(Date.UTC(nextStart.year, nextStart.month - 1, nextStart.day));
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  return {
    start: toIsoDate(start),
    end: endDate.toISOString().slice(0, 10),
  };
}
