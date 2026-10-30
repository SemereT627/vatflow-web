"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Mirrors INACTIVITY_LIMIT_MS in src/proxy.ts.
const TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;
// Shared across tabs: activity in one tab keeps the others signed in.
const STORAGE_KEY = "vatflow:last-activity";

function readLast(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Signs the user out after 30 minutes without activity, with a 2-minute
 * warning. The proxy enforces the same limit server-side, but only when a
 * request arrives — this makes an idle open tab actually sign out on screen.
 */
export function SessionTimeout() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastPing = useRef(0);
  const signingOut = useRef(false);

  useEffect(() => {
    function markActive() {
      const now = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // storage unavailable (private mode) — fall back to this tab only
      }
      // Keep the server-side last_activity cookie fresh while working on a
      // page without navigating.
      if (now - lastPing.current > HEARTBEAT_MS) {
        lastPing.current = now;
        fetch("/keepalive", { cache: "no-store" }).catch(() => {});
      }
    }

    async function signOut() {
      if (signingOut.current) return;
      signingOut.current = true;
      await createClient().auth.signOut();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears cached signed-in screens
      window.location.assign("/login");
    }

    function tick() {
      const idle = Date.now() - readLast();
      if (idle >= TIMEOUT_MS) {
        signOut();
      } else if (idle >= TIMEOUT_MS - WARNING_MS) {
        setSecondsLeft(Math.ceil((TIMEOUT_MS - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }

    markActive();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    const interval = window.setInterval(tick, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      window.clearInterval(interval);
    };
  }, []);

  function staySignedIn() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    lastPing.current = Date.now();
    fetch("/keepalive", { cache: "no-store" }).catch(() => {});
    setSecondsLeft(null);
  }

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <AlertDialog open={secondsLeft !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be signed out in{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {minutes}:{String(seconds).padStart(2, "0")}
            </span>{" "}
            because you&apos;ve been inactive for a while.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" onClick={staySignedIn}>
            Stay signed in
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
