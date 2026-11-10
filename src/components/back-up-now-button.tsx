"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { backUpNow } from "@/app/actions/backups";
import { Button } from "@/components/ui/button";

export function BackUpNowButton() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setRunning(true);
    setStatus(null);
    try {
      await backUpNow();
      setStatus({ ok: true, text: "Backup saved." });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Backup failed." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={run} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Save />}
        {running ? "Backing up…" : "Back up now"}
      </Button>
      {status && (
        <p role="status" className={`text-xs font-medium ${status.ok ? "text-good" : "text-critical"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
