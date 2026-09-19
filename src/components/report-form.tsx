"use client";

import { useState } from "react";
import { ethiopianMonthName, gregorianToEthiopian } from "@/lib/ethiopian";

const MONTHS = Array.from({ length: 13 }, (_, i) => i + 1);

export function ReportForm() {
  const now = gregorianToEthiopian(new Date());
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);

  const href = `/api/exports/monthly?year=${year}&month=${month}`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-gray-500">Month</label>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {ethiopianMonthName(m)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <a
        href={href}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Download XLSX
      </a>
    </div>
  );
}
