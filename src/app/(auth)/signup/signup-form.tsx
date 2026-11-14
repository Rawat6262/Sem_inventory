"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { savePendingEmail } from "@/lib/pending-email";
import { ROLE_LABELS, SIGNUP_ROLES } from "@/lib/permissions";

type Place = { name: string; isoCode: string };

const EMPTY = {
  full_name: "",
  gmail: "",
  mobile_number: "",
  password: "",
  confirm: "",
  role: "",
  gender: "",
  country: "",
  state: "",
  city: "",
  address: "",
};

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [countryCode, setCountryCode] = useState("IN");
  const [stateCode, setStateCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const countries = useQuery({
    queryKey: ["location", "countries"],
    queryFn: () => api<Place[]>("location/countries"),
    staleTime: Infinity,
  });
  const states = useQuery({
    queryKey: ["location", "states", countryCode],
    queryFn: () => api<Place[]>(`location/states/${countryCode}`),
    enabled: Boolean(countryCode),
    staleTime: Infinity,
  });
  const cities = useQuery({
    queryKey: ["location", "cities", countryCode, stateCode],
    queryFn: () => api<{ name: string }[]>(`location/cities/${countryCode}/${stateCode}`),
    enabled: Boolean(countryCode && stateCode),
    staleTime: Infinity,
  });

  const countryName = countries.data?.find((c) => c.isoCode === countryCode)?.name ?? "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!/^\d{10}$/.test(form.mobile_number.trim())) return setError("Enter a 10-digit mobile number.");

    setLoading(true);
    try {
      const gmail = form.gmail.trim().toLowerCase();
      await api("signup", {
        method: "POST",
        body: {
          full_name: form.full_name.trim(),
          gmail,
          mobile_number: Number(form.mobile_number.trim()),
          password: form.password,
          role: form.role,
          gender: form.gender,
          country: countryName,
          state: form.state,
          city: form.city,
          address: form.address.trim(),
        },
      });
      savePendingEmail(gmail);
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setLoading(false);
    }
  }

  const required = ["full_name", "gmail", "mobile_number", "password", "confirm", "role", "gender", "state", "city", "address"] as const;
  const complete = required.every((k) => form[k].trim()) && countryCode;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-muted">
        An admin approves new accounts with a verification code.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <Field label="Full name" className="sm:col-span-2">
          {(id) => <Input id={id} autoComplete="name" value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} />}
        </Field>
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" value={form.gmail} onChange={(e) => set("gmail")(e.target.value)} />}
        </Field>
        <Field label="Mobile number">
          {(id) => (
            <Input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.mobile_number} onChange={(e) => set("mobile_number")(e.target.value.replace(/\D/g, ""))} />
          )}
        </Field>
        <Field label="Password" hint="At least 6 characters">
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password")(e.target.value)} />}
        </Field>
        <Field label="Confirm password">
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm")(e.target.value)} />}
        </Field>
        <Field label="Role">
          {(id) => (
            <Select id={id} value={form.role} onChange={(e) => set("role")(e.target.value)}>
              <option value="">Select role</option>
              {SIGNUP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Gender">
          {(id) => (
            <Select id={id} value={form.gender} onChange={(e) => set("gender")(e.target.value)}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHERS">Other</option>
            </Select>
          )}
        </Field>
        <Field label="Country">
          {(id) => (
            <Select
              id={id}
              value={countryCode}
              disabled={countries.isLoading}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setStateCode("");
                setForm((f) => ({ ...f, state: "", city: "" }));
              }}
            >
              {countries.isLoading && <option value="IN">Loading…</option>}
              {countries.data?.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="State">
          {(id) => (
            <Select
              id={id}
              value={stateCode}
              disabled={!states.data?.length}
              onChange={(e) => {
                const code = e.target.value;
                setStateCode(code);
                setForm((f) => ({ ...f, state: states.data?.find((s) => s.isoCode === code)?.name ?? "", city: "" }));
              }}
            >
              <option value="">{states.isLoading ? "Loading…" : "Select state"}</option>
              {states.data?.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="City">
          {(id) =>
            stateCode && cities.data && cities.data.length === 0 ? (
              <Input id={id} value={form.city} onChange={(e) => set("city")(e.target.value)} placeholder="Type your city" />
            ) : (
              <Select id={id} value={form.city} disabled={!cities.data?.length} onChange={(e) => set("city")(e.target.value)}>
                <option value="">{cities.isLoading ? "Loading…" : "Select city"}</option>
                {cities.data?.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )
          }
        </Field>
        <Field label="Address">
          {(id) => <Input id={id} autoComplete="street-address" value={form.address} onChange={(e) => set("address")(e.target.value)} />}
        </Field>
        {countries.isError && (
          <div className="sm:col-span-2">
            <Alert>Could not load the country list. Check that the server is running.</Alert>
          </div>
        )}
        <Button type="submit" loading={loading} disabled={!complete} className="sm:col-span-2">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
