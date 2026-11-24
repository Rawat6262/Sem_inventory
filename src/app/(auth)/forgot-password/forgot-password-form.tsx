"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, authApi } from "@/lib/api";

// Backend flow: POST /forgetpassword { gmail } sends a code;
// POST /verifyforgetpassword { gmail, otp, newPass } changes the password and
// ends every login. The password goes with the code, never before it: anyone
// can ask for a code, only the account's owner receives it.
export function ForgotPasswordForm() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [gmail, setGmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { message } = await api<{ message?: string }>("forgetpassword", { method: "POST", body: { gmail: gmail.trim().toLowerCase() } });
      // Says so when a code from a minute ago is still the one to use.
      setNotice(message ?? null);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPass.length < 6) return setError("Password must be at least 6 characters.");
    if (newPass !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await api("verifyforgetpassword", { method: "POST", body: { gmail: gmail.trim().toLowerCase(), otp: otp.trim(), newPass } });
      setStep("done");
      // The page stays mounted in the background: don't keep the password in it.
      setNewPass("");
      setConfirm("");
      setOtp("");
      // Any login in this browser has ended too.
      queryClient.clear();
      await authApi("logout", { method: "POST" }).catch(() => {});
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
        <p className="mt-1 text-sm text-muted">You&apos;ve been logged out on every device. Log in with your new password.</p>
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
          ? "We'll email you a code. Then you choose a new password."
          : `Enter the 6-digit code emailed to ${gmail.trim()} and your new password. The code expires after 5 minutes.`}
      </p>

      {step === "request" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
          className="mt-8 flex flex-col gap-4"
          noValidate
        >
          {error && <Alert>{error}</Alert>}
          <Field label="Email">
            {(id) => <Input id={id} type="email" autoComplete="email" value={gmail} onChange={(e) => setGmail(e.target.value)} />}
          </Field>
          <Button type="submit" loading={loading} disabled={!gmail.trim()}>
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 flex flex-col gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
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
          <Field label="New password" hint="At least 6 characters">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <Button type="submit" loading={loading} disabled={otp.length !== 6 || !newPass || !confirm}>
            Change password
          </Button>
          <Button type="button" variant="ghost" onClick={() => void requestCode()} disabled={loading}>
            Send a new code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setError(null);
              setNotice(null);
              setOtp("");
              setStep("request");
            }}
            disabled={loading}
          >
            Use a different email
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
