"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ME_KEY, type Me } from "@/hooks/use-me";
import { authApi, safeNext } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await authApi<{ user: Me }>("login", { method: "POST", body: { gmail: gmail.trim(), password } });
      queryClient.clear(); // nothing from an earlier login in this tab
      queryClient.setQueryData(ME_KEY, user);
      setPassword("");
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      // Cache Components keeps this page's state after navigating away, so a
      // flag left on would show a stuck button on the next visit.
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-muted">Welcome back. Use the email you signed up with.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          {(id) => (
            <Input id={id} type="email" autoComplete="email" required value={gmail} onChange={(e) => setGmail(e.target.value)} />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-sm text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} disabled={!gmail || !password}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
