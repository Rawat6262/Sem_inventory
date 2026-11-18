"use client";

// Country → State → City pickers for address forms, from the backend's public
// /location lookups (the same lists the sign-up form uses). Values are stored
// as names. A saved value that isn't in the lists (typed before these pickers
// existed) stays selectable so editing an old record doesn't lose it. City is
// a text box with suggestions, so a town missing from the list can still be typed.

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";

type Place = { name: string; isoCode: string };
export type LocationValue = { country: string; state: string; city: string };

const same = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
const CURRENT = "__current";

export function LocationFields({ value, onChange }: { value: LocationValue; onChange: (next: LocationValue) => void }) {
  const listId = useId();

  const countries = useQuery({
    queryKey: ["location", "countries"],
    queryFn: () => api<Place[]>("location/countries"),
    staleTime: Infinity,
  });
  const country = countries.data?.find((c) => same(c.name, value.country));

  const states = useQuery({
    queryKey: ["location", "states", country?.isoCode],
    queryFn: () => api<Place[]>(`location/states/${country!.isoCode}`),
    enabled: Boolean(country),
    staleTime: Infinity,
  });
  const state = states.data?.find((s) => same(s.name, value.state));

  const cities = useQuery({
    queryKey: ["location", "cities", country?.isoCode, state?.isoCode],
    queryFn: () => api<{ name: string }[]>(`location/cities/${country!.isoCode}/${state!.isoCode}`),
    enabled: Boolean(country && state),
    staleTime: Infinity,
  });

  return (
    <>
      <Field label="Country">
        {(id) => (
          <Select
            id={id}
            required
            value={country?.isoCode ?? (value.country ? CURRENT : "")}
            disabled={countries.isLoading}
            onChange={(e) => {
              const picked = countries.data?.find((c) => c.isoCode === e.target.value);
              onChange({ country: picked?.name ?? value.country, state: "", city: "" });
            }}
          >
            <option value="">{countries.isLoading ? "Loading…" : "Select country"}</option>
            {!country && value.country && <option value={CURRENT}>{value.country}</option>}
            {countries.data?.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="State">
        {(id) =>
          country && states.data && states.data.length === 0 ? (
            <Input id={id} required value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value })} placeholder="Type the state" />
          ) : (
            <Select
              id={id}
              required
              value={state?.isoCode ?? (value.state ? CURRENT : "")}
              disabled={!country || states.isLoading}
              onChange={(e) => {
                const picked = states.data?.find((s) => s.isoCode === e.target.value);
                onChange({ ...value, state: picked?.name ?? value.state, city: "" });
              }}
            >
              <option value="">{!country ? "Pick a country first" : states.isLoading ? "Loading…" : "Select state"}</option>
              {!state && value.state && <option value={CURRENT}>{value.state}</option>}
              {states.data?.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </option>
              ))}
            </Select>
          )
        }
      </Field>

      <Field label="City" hint={state && cities.data?.length ? "Pick from the list or type it" : undefined}>
        {(id) => (
          <>
            <Input
              id={id}
              required
              list={`${listId}-cities`}
              autoComplete="off"
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder={state ? (cities.isLoading ? "Loading cities…" : "Start typing a city") : "Type the city"}
            />
            <datalist id={`${listId}-cities`}>
              {cities.data?.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </>
        )}
      </Field>
    </>
  );
}
