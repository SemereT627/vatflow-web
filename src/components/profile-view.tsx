"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Factor } from "@supabase/supabase-js";
import { KeyRound, Laptop, Loader2, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOwnName } from "@/app/actions/profile";
import { formatEthiopianDate } from "@/lib/ethiopian";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

const MIN_PASSWORD = 8;
// Mirrors INACTIVITY_LIMIT_MS in src/proxy.ts.
const INACTIVITY_HOURS = 2;

function formatDate(iso: string) {
  const greg = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${greg} · ${formatEthiopianDate(iso)}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Chrome on macOS" — enough to recognise the device without a UA library. */
function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "unknown OS";
  return { label: `${browser} on ${os}`, mobile: /iPhone|iPad|Android/.test(ua) };
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-soft" />
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function StatusLine({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div className="min-h-5 text-sm" role="status" aria-live="polite">
      {error && <p className="font-medium text-critical">{error}</p>}
      {!error && success && <p className="font-semibold text-good">{success}</p>}
    </div>
  );
}

export function ProfileView({
  fullName: initialName,
  role,
  shopName,
  email,
  createdAt,
  lastSignInAt,
}: {
  fullName: string;
  role: "admin" | "seller";
  shopName: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState(initialName);
  const [nameStatus, setNameStatus] = useState<{ error: string | null; success: string | null }>({ error: null, success: null });
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ error: string | null; success: string | null }>({ error: null, success: null });
  const [savingPassword, setSavingPassword] = useState(false);

  const [factor, setFactor] = useState<Factor | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [signOutOthersOpen, setSignOutOthersOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<{ error: string | null; success: string | null }>({ error: null, success: null });
  const [signingOut, setSigningOut] = useState(false);

  // Browser-only value; empty on the server so hydration matches.
  const userAgent = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent,
    () => "",
  );
  const device = userAgent ? describeDevice(userAgent) : null;

  async function loadFactor() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactor(data?.totp.find((f) => f.status === "verified") ?? null);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (active) setFactor(data?.totp.find((f) => f.status === "verified") ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameStatus({ error: null, success: null });
    try {
      await updateOwnName(fullName);
      setNameStatus({ error: null, success: "Saved." });
      router.refresh();
    } catch (err) {
      setNameStatus({ error: err instanceof Error ? err.message : "Could not save.", success: null });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setPasswordStatus({ error: "Passwords don't match.", success: null });
      return;
    }
    setSavingPassword(true);
    setPasswordStatus({ error: null, success: null });
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      setPasswordStatus({ error: error.message, success: null });
      return;
    }
    setPassword("");
    setConfirm("");
    setPasswordStatus({ error: null, success: "Password updated." });
  }

  async function signOutOthers() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSigningOut(false);
    setSignOutOthersOpen(false);
    setSessionStatus(
      error ? { error: error.message, success: null } : { error: null, success: "Signed out of all other devices." },
    );
  }

  async function signOutHere() {
    await supabase.auth.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- clears cached signed-in screens
    window.location.assign("/login");
  }

  const initials = (fullName || email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Account summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-surface-2 font-heading text-base font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{initialName}</div>
          <div className="truncate text-sm text-ink-soft">{email}</div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold">
            <span className="capitalize">{role}</span> · {shopName}
          </span>
          <span className="text-xs text-ink-soft">Member since {formatDate(createdAt)}</span>
        </div>
      </div>

      <Section icon={UserRound} title="Personal info" description="How your name appears on sales and to your shop.">
        <form onSubmit={saveName} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled readOnly />
            <p className="text-xs text-ink-soft">
              {role === "admin" ? "Contact support to change the admin email." : "Ask your shop admin to change your email."}
            </p>
          </div>
          <StatusLine {...nameStatus} />
          <Button type="submit" disabled={savingName || fullName.trim() === initialName}>
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingName ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Section>

      <Section icon={KeyRound} title="Password" description={`At least ${MIN_PASSWORD} characters. You stay signed in on this device.`}>
        <form onSubmit={savePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <StatusLine {...passwordStatus} />
          <Button type="submit" disabled={savingPassword}>
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Section>

      <Section
        icon={ShieldCheck}
        title="Two-step sign-in"
        description="Required on the web. You enter a code from your authenticator app after your password."
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-background p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Authenticator app</span>
                <span className="rounded-full bg-good-bg px-2 py-0.5 text-[11px] font-bold text-good">On</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {factor ? `Added ${formatDate(factor.created_at)}` : "Set up when you signed in."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setReplaceOpen(true)}>
              Replace
            </Button>
          </div>
          <p className="text-xs text-ink-soft">
            New phone? Use Replace while you still have the old one. Lost it?{" "}
            {role === "admin"
              ? "Run scripts/reset-mfa.mjs with your email (see the README)."
              : "Ask your shop admin to reset it from the Sellers page."}
          </p>
        </div>
      </Section>

      <Section icon={Laptop} title="Sessions" description="Where you're signed in, and how to end those sessions.">
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-background p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-2 text-ink-soft">
              {device?.mobile ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{device?.label ?? "This device"}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                  This device
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                {lastSignInAt && <div>Signed in {formatDateTime(lastSignInAt)}</div>}
                <div>Verified with your authenticator</div>
                <div>Signs out automatically after {INACTIVITY_HOURS} hours of inactivity</div>
              </div>
            </div>
          </div>

          <StatusLine {...sessionStatus} />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setSignOutOthersOpen(true)}>
              Sign out other devices
            </Button>
            <Button type="button" variant="destructive" onClick={signOutHere}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
          <p className="text-xs text-ink-soft">
            Signing out other devices also signs you out of the VatFlow mobile app.
          </p>
        </div>
      </Section>

      <ConfirmDialog
        open={signOutOthersOpen}
        onOpenChange={setSignOutOthersOpen}
        title="Sign out of all other devices?"
        description="Every other browser and the mobile app will need to sign in again. You stay signed in here."
        confirmLabel="Sign out others"
        pendingLabel="Signing out…"
        pending={signingOut}
        onConfirm={signOutOthers}
      />

      {/* Mounted only while open, so each attempt starts a fresh enrolment */}
      {replaceOpen && (
        <ReplaceAuthenticatorDialog
          oldFactorId={factor?.id ?? null}
          onClose={() => setReplaceOpen(false)}
          onReplaced={loadFactor}
        />
      )}
    </div>
  );
}

/**
 * Enrol a new TOTP factor, confirm it with a code, then remove the old one —
 * the account is never left without a working authenticator.
 */
function ReplaceAuthenticatorDialog({
  oldFactorId,
  onClose,
  onReplaced,
}: {
  oldFactorId: string | null;
  onClose: () => void;
  onReplaced: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [enrolment, setEnrolment] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Strict Mode runs effects twice in dev; enrol only once per open.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        // Friendly names must be unique per user.
        friendlyName: `VatFlow ${new Date().toISOString()}`,
        issuer: "VatFlow",
      });
      if (error || !data) {
        setError(error?.message ?? "Couldn't start setup.");
        return;
      }
      setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [supabase]);

  async function cancel() {
    // Abandoned before confirming: drop the unverified factor.
    if (enrolment && !busy) await supabase.auth.mfa.unenroll({ factorId: enrolment.id });
    onClose();
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolment) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolment.id, code: code.trim() });
    if (error) {
      setError("That code didn't work. Check the new entry in your authenticator app.");
      setCode("");
      setBusy(false);
      return;
    }
    if (oldFactorId) await supabase.auth.mfa.unenroll({ factorId: oldFactorId });
    setBusy(false);
    onReplaced();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace authenticator</DialogTitle>
          <DialogDescription>
            Scan this with the authenticator app on your new phone, then enter the code it shows. Your old
            authenticator stops working once this is confirmed.
          </DialogDescription>
        </DialogHeader>

        {!enrolment && !error && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="Loading" />
          </div>
        )}

        {enrolment && (
          <form onSubmit={confirm} className="space-y-4">
            {/* QR code is an SVG data URL generated by Supabase */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolment.qr} alt="QR code for your authenticator app" className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />
            <p className="text-center text-xs text-ink-soft">
              Can&apos;t scan? Enter this key:
              <span className="mt-1 block break-all font-mono text-sm tracking-wider text-foreground select-all">
                {enrolment.secret}
              </span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="newCode">6-digit code</Label>
              <Input
                id="newCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-11 text-center font-mono text-lg tracking-[0.4em]"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm font-medium text-critical">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm and replace
              </Button>
            </DialogFooter>
          </form>
        )}

        {!enrolment && error && <p className="text-sm font-medium text-critical">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
