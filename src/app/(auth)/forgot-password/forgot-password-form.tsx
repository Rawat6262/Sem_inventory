"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

// Backend flow: POST /forgetpassword { gmail, newPass } sends a code;
// POST /verifyforgetpassword { gmail, otp } applies the new password.
export function ForgotPasswordForm() {
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [gmail, setGmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPass.length < 6) return setError("Password must be at least 6 characters.");
    if (newPass !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await api("forgetpassword", { method: "POST", body: { gmail: gmail.trim().toLowerCase(), newPass } });
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the reset");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("verifyforgetpassword", { method: "POST", body: { gmail: gmail.trim().toLowerCase(), otp: otp.trim() } });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Password changed</h1>
        <p className="mt-1 text-sm text-muted">You can now log in with your new password.</p>
        <Link href="/login" className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-ink hover:opacity-90">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">
        {step === "request"
          ? "Choose a new password. We'll email you a code to confirm it."
          : "Enter the 6-digit code we emailed you. It expires after 5 minutes."}
      </p>

      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-8 flex flex-col gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label="Email">
            {(id) => <Input id={id} type="email" autoComplete="email" value={gmail} onChange={(e) => setGmail(e.target.value)} />}
          </Field>
          <Field label="New password" hint="At least 6 characters">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <Button type="submit" loading={loading} disabled={!gmail || !newPass || !confirm}>
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 flex flex-col gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label="Verification code">
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="font-mono text-lg tracking-[0.4em]"
              />
            )}
          </Field>
          <Button type="submit" loading={loading} disabled={otp.length < 4}>
            Change password
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("request")}>
            Start over
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
