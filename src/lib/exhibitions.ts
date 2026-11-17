"use client";

// Exhibitions module: exhibitions themselves, and the clients booked into
// each one. Deeper money/stock breakdowns live in the Reports module (see
// the "View full summary" link on the detail page) and every create/update/
// delete here is already picked up by the Activity module automatically —
// the backend logs it. Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { contractorKeys } from "@/lib/contractors";

// ─── Types (as the Express API returns them) ───────────────────────────────

export type Exhibition = {
  _id: string;
  name: string;
  venue: string;
  organiser?: string;
  email?: string;
  phone?: string;
  startDate: string;
  endDate: string;
  country: string;
  state: string;
  city: string;
  zipCode?: string;
  remarks?: string;
  client?: string[]; // unpopulated on the list endpoint — just ids
  createdBy?: string | null;
  createdAt?: string;
};

export type ExhibitionClientStall = {
  _id: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
  deal_amount: number;
  advance_payment: number;
  received_payment: number;
  total_paid: number;
  remaining_payment: number;
};

/** One row from GET /exhibitions/:id/clients — already flattened to this exhibition. */
export type ExhibitionClientRow = {
  clientId: string;
  clientName: string;
  companyName?: string;
  phoneNumber: string;
  address?: string;
  stalls: ExhibitionClientStall[];
  totals: {
    total_deal_amount: number;
    total_paid: number;
    total_remaining: number;
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) =>
  numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
export const fmtMoney = (n: number | null | undefined) =>
  moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
export const fmtDate = (d: string | null | undefined) =>
  d ? dateFormat.format(new Date(d)) : "—";

export function dateRange(e: Pick<Exhibition, "startDate" | "endDate">) {
  return `${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}`;
}

// ─── Queries ───────────────────────────────────────────────────────────────

export const exhibitionKeys = {
  all: ["exhibitions-module"] as const,
  list: ["exhibitions-module", "list"] as const,
  detail: (id: string) => ["exhibitions-module", "detail", id] as const,
  clients: (id: string) => ["exhibitions-module", "clients", id] as const,
};

export function useExhibitions() {
  return useQuery({
    queryKey: exhibitionKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Exhibition[] }>("getexhibitions");
      return [...res.data].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
    },
  });
}

export function useExhibition(id: string) {
  return useQuery({
    queryKey: exhibitionKeys.detail(id),
    queryFn: async () =>
      (await api<{ data: Exhibition }>(`getsingleexhibition/${id}`)).data,
    enabled: Boolean(id),
  });
}

/** Clients booked for this exhibition, with their stalls already filtered to it. */
export function useExhibitionClients(id: string, enabled = true) {
  return useQuery({
    queryKey: exhibitionKeys.clients(id),
    queryFn: async () =>
      (await api<{ data: ExhibitionClientRow[] }>(`exhibitions/${id}/clients`))
        .data,
    enabled: Boolean(id) && enabled,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useExhibitionsMutation<TInput>(
  fn: (input: TInput) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exhibitionKeys.all });
      // Keep every other module's "pick an exhibition" dropdown in sync too.
      qc.invalidateQueries({ queryKey: contractorKeys.exhibitions });
    },
  });
}

export type ExhibitionInput = {
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  country: string;
  state: string;
  city: string;
  organiser?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  remarks?: string;
};

export const saveExhibition = ({
  id,
  ...body
}: ExhibitionInput & { id?: string }) =>
  id
    ? api(`updateexhibition/${id}`, { method: "PUT", body })
    : api("createexhibition", { method: "POST", body });

export const deleteExhibition = (id: string) =>
  api(`deleteexhibition/${id}`, { method: "DELETE" });
