"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ME_KEY, type Me } from "@/hooks/use-me";
import { api, authApi } from "@/lib/api";
import { clearPendingEmail, readPendingEmail } from "@/lib/pending-email";

export function VerifyOtpForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [gmail, setGmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // sessionStorage only exists in the browser, so read it after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setGmail(readPendingEmail()), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { user } = await authApi<{ user: Me }>("verify-otp", {
        method: "POST",
        body: { gmail: gmail.trim().toLowerCase(), otp: otp.trim() },
      });
      clearPendingEmail();
      queryClient.setQueryData(ME_KEY, user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      // The page stays mounted in the background (Cache Components).
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await api("resendotp", { method: "POST", body: { gmail: gmail.trim().toLowerCase() } });
      setNotice("A new code has been sent. Codes expire after 5 minutes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Verify your account</h1>
      <p className="mt-1 text-sm text-muted">
        The 6-digit code goes to the SEM Group office, not to you. Ask an admin for it. It expires after 5 minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" value={gmail} onChange={(e) => setGmail(e.target.value)} />}
        </Field>
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
        <Button type="submit" loading={loading} disabled={!gmail || otp.length < 4}>
          Verify and continue
        </Button>
        <Button type="button" variant="ghost" onClick={resend} loading={resending} disabled={!gmail}>
          Send a new code
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
