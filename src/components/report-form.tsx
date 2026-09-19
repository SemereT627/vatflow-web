"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ethiopianMonthName, gregorianToEthiopian } from "@/lib/ethiopian";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MONTHS = Array.from({ length: 13 }, (_, i) => i + 1);

export function ReportForm() {
  const now = gregorianToEthiopian(new Date());
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);

  const href = `/api/exports/monthly?year=${year}&month=${month}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download />
          Export XLSX
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export monthly journal</DialogTitle>
          <DialogDescription>Pick an Ethiopian month to download the XLSX in the Ministry of Revenue format.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Month</label>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {ethiopianMonthName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Year</label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
          </div>
        </div>

        <DialogFooter>
          <Button asChild>
            <a href={href} onClick={() => setOpen(false)}>
              <Download />
              Download XLSX
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
