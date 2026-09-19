"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Receipt, TrendingUp, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetStatus(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then click “Forgot password”.");
      return;
    }
    setError(null);
    setResetStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setResetStatus(error ? error.message : "Password reset link sent — check your inbox.");
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form column */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand font-heading text-base font-bold text-brand-ink">
              VF
            </div>
            <div>
              <div className="font-heading text-lg font-bold leading-none">VatFlow</div>
              <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sign in to continue managing your sales and VAT records.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex select-none items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-brand"
              />
              Remember me
            </label>

            {/* Reserve space so error/status text never shifts layout */}
            <div className="min-h-5 text-sm" role="status" aria-live="polite">
              {error && <p className="font-medium text-critical">{error}</p>}
              {!error && resetStatus && <p className="font-medium text-good">{resetStatus}</p>}
            </div>

            <Button type="submit" disabled={loading} className="h-10 w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      {/* Decorative brand panel */}
      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--color-brand) 35%, transparent), transparent 55%), radial-gradient(circle at 85% 75%, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 50%), var(--color-background)",
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-foreground)" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="max-w-md">
            <h2 className="font-heading text-3xl font-bold leading-tight">
              Every sale, reconciled into an export-ready VAT journal.
            </h2>
            <p className="mt-3 text-[15px] text-ink-soft">
              Receipts recorded at the till sync automatically into one ledger — VAT collected, categorized,
              and export-ready.
            </p>
          </div>

          <div className="relative flex-1">
            <FlowCard
              icon={<Receipt className="h-4 w-4" />}
              label="Receipt synced"
              detail="VR-10832 · 424.66 ETB"
              className="left-0 top-10 rotate-[-3deg]"
            />
            <FlowCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="VAT collected"
              detail="+12.4% this month"
              accent
              className="left-24 top-40 rotate-[2deg]"
            />
            <FlowCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Journal export"
              detail="Meskerem journal ready"
              className="left-4 top-[17rem] rotate-[-1.5deg]"
            />
          </div>

          <p className="text-xs text-ink-faint">Built for Ethiopian retail shops · VAT rate configurable per shop</p>
        </div>
      </div>
    </div>
  );
}

function FlowCard({
  icon,
  label,
  detail,
  accent,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`absolute w-64 rounded-xl border border-line bg-surface/90 p-4 shadow-lg backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md ${
            accent ? "bg-accent text-accent-ink" : "bg-brand text-brand-ink"
          }`}
        >
          {icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      </div>
      <p className="num mt-2 text-sm font-semibold">{detail}</p>
    </div>
  );
}
