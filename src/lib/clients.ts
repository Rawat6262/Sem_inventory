"use client";

// Clients module: client details, the exhibitions/stalls they've booked,
// payments against those stalls, and design options per exhibition. Every
// call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { exhibitionRefId, exhibitionRefName, useExhibitionsList, type ExhibitionRef } from "@/lib/contractors";

export { exhibitionRefId, exhibitionRefName, useExhibitionsList };
export type { ExhibitionRef };

// ─── Types (as the Express API returns them) ───────────────────────────────

export type ClientStall = {
  _id: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
  deal_amount: number;
  advance_payment: number;
  received_payment: number;
  total_paid: number;
  remaining_payment: number;
  // Set on every stall of a rejected client: kept, but left out of every total.
  rejected?: boolean;
  reject_reason?: string;
  rejected_by?: { _id: string; full_name?: string; role?: string } | string | null;
  rejected_at?: string | null;
};

export type Design = {
  _id: string;
  client?: string;
  exhibition?: string;
  option_no: number;
  remarks?: string;
  isfinal: boolean;
  createdBy?: string | null;
  createdAt?: string;
};

export type ClientExhibitionEntry = {
  _id: string;
  exhibition: ExhibitionRef | string;
  stalls: ClientStall[];
  designs: (Design | string)[];
  total_deal_amount: number;
  total_paid: number;
  total_remaining: number;
};

export type Client = {
  _id: string;
  clientName: string;
  companyName?: string;
  phoneNumber: string;
  address?: string;
  exhibition: ClientExhibitionEntry[];
  createdBy?: { _id: string; full_name?: string } | string | null;
  createdAt?: string;
  // A lead client that someone rejected, with why. Left out of every total.
  rejected?: boolean;
  reject_reason?: string;
  rejected_by?: { _id: string; full_name?: string; role?: string } | string | null;
  rejected_at?: string | null;
};

/** Another user's client, as the directory shows it: names only. */
export type DirectoryClient = { _id: string; companyName: string; clientName: string; addedBy: string | null };

/** Who added a client, when the API populated it. */
export function addedByName(c: Client): string | null {
  return c.createdBy && typeof c.createdBy === "object" ? (c.createdBy.full_name ?? null) : null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Totals for one client across every exhibition/stall they have. */
export function clientTotals(c: Client) {
  return c.exhibition.reduce(
    (acc, e) => ({
      deal: acc.deal + (e.total_deal_amount || 0),
      paid: acc.paid + (e.total_paid || 0),
      remaining: acc.remaining + (e.total_remaining || 0),
      stalls: acc.stalls + e.stalls.filter((s) => !s.rejected).length, // rejected leads aren't deals
    }),
    { deal: 0, paid: 0, remaining: 0, stalls: 0 },
  );
}

/**
 * Where a deal stands:
 * - lead: details and/or deal amount only, nothing paid yet
 * - final: an advance or payment came in, but some amount is still due
 * - fully_paid: nothing remaining
 * - rejected: a lead client someone rejected (with a reason); not counted anywhere
 */
export type DealStatus = "lead" | "final" | "fully_paid" | "rejected";

export const DEAL_STATUSES: DealStatus[] = ["lead", "final", "fully_paid", "rejected"];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  lead: "Lead",
  final: "Final",
  fully_paid: "Fully paid",
  rejected: "Rejected",
};

export const DEAL_STATUS_HINTS: Record<DealStatus, string> = {
  lead: "Deal agreed, nothing paid yet",
  final: "Payment received, amount still due",
  fully_paid: "Nothing remaining",
  rejected: "Lead rejected; left out of the totals",
};

function dealStatusOf(deal: number, paid: number, remaining: number): DealStatus {
  if (deal > 0 && remaining <= 0) return "fully_paid";
  if (paid > 0) return "final";
  return "lead";
}

export function stallStatus(s: ClientStall): DealStatus {
  if (s.rejected) return "rejected";
  return dealStatusOf(s.deal_amount || 0, s.total_paid || 0, s.remaining_payment || 0);
}

/** A client's status across all their stalls (no stalls yet counts as a lead). */
export function clientStatus(c: Client): DealStatus {
  if (c.rejected) return "rejected";
  const t = clientTotals(c);
  return dealStatusOf(t.deal, t.paid, t.remaining);
}

export function designOf(d: Design | string): Design | null {
  return typeof d === "object" ? d : null;
}

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

// ─── Queries ───────────────────────────────────────────────────────────────

export const clientKeys = {
  all: ["clients"] as const,
  list: ["clients", "list"] as const,
  directory: ["clients", "directory"] as const,
  detail: (id: string) => ["clients", "detail", id] as const,
};

// A client is identified by its company, so lists are ordered by company.
const byCompany = (a: { companyName?: string; clientName: string }, b: { companyName?: string; clientName: string }) =>
  (a.companyName || a.clientName).localeCompare(b.companyName || b.clientName);

export function useClients() {
  return useQuery({
    queryKey: clientKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Client[] }>("getAllClients");
      return [...res.data].sort(byCompany);
    },
  });
}

/** Clients added by other users (company and client name only). */
export function useClientDirectory(enabled: boolean) {
  return useQuery({
    queryKey: clientKeys.directory,
    queryFn: async () => [...(await api<{ data: DirectoryClient[] }>("client-directory")).data].sort(byCompany),
    enabled,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => (await api<{ data: Client }>(`getClientById/${id}`)).data,
    enabled: Boolean(id),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useClientsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export type ClientInput = { clientName: string; companyName: string; phoneNumber: string; address?: string };

// updateClient replaces all 4 fields (not a partial merge) — always send the full set.
export const saveClient = ({ id, ...body }: ClientInput & { id?: string }) =>
  id ? api(`updateClient/${id}`, { method: "PUT", body }) : api("createClient", { method: "POST", body });

export const deleteClient = (id: string) => api(`deleteClient/${id}`, { method: "DELETE" });

/** Books a client for an exhibition with its first stall, or adds another stall if already booked. */
export type AddStallInput = {
  clientId: string;
  exhibitionId: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
  deal_amount?: number;
  advance_payment?: number;
  received_payment?: number;
};

export const addClientStall = ({ clientId, exhibitionId, ...body }: AddStallInput) =>
  api(`${clientId}/exhibitions/${exhibitionId}`, { method: "POST", body });

export const removeExhibitionFromClient = ({ clientId, exhibitionId }: { clientId: string; exhibitionId: string }) =>
  api(`${clientId}/exhibitions/${exhibitionId}`, { method: "DELETE" });

/** Basic stall details only — use updateClientPayment for money fields. */
export type UpdateStallInput = {
  clientId: string;
  exhibitionId: string;
  stallId: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
};

export const updateClientStall = ({ clientId, exhibitionId, stallId, ...body }: UpdateStallInput) =>
  api(`${clientId}/exhibitions/${exhibitionId}/stalls/${stallId}`, { method: "PATCH", body });

export const removeClientStall = ({ clientId, exhibitionId, stallId }: { clientId: string; exhibitionId: string; stallId: string }) =>
  api(`${clientId}/exhibitions/${exhibitionId}/stalls/${stallId}`, { method: "DELETE" });

/** Sets (not increments) a stall's money fields directly. */
export type UpdatePaymentInput = {
  clientId: string;
  exhibitionId: string;
  stallId: string;
  deal_amount?: number;
  advance_payment?: number;
  received_payment?: number;
};

export const updateClientPayment = ({ clientId, exhibitionId, stallId, ...body }: UpdatePaymentInput) =>
  api(`${clientId}/exhibitions/${exhibitionId}/stalls/${stallId}/payment`, { method: "PATCH", body });

/** Reject a lead client (nothing paid yet) with a reason. */
export const rejectClient = ({ clientId, reason }: { clientId: string; reason: string }) =>
  api(`client/${clientId}/reject`, { method: "PATCH", body: { reason } });

/** Put a rejected client back as a lead; it counts in the totals again. */
export const reopenClient = (clientId: string) => api(`client/${clientId}/reopen`, { method: "PATCH" });

/** Who rejected a client, when the API populated it. */
export function rejectedByName(c: Client): string | null {
  return c.rejected_by && typeof c.rejected_by === "object" ? (c.rejected_by.full_name ?? null) : null;
}

// ─── Designs ────────────────────────────────────────────────────────────────

export type DesignInput = { clientId: string; exhibitionId: string; option_no: number; remarks?: string };

export const createDesign = ({ clientId, exhibitionId, ...body }: DesignInput) =>
  api(`design/${clientId}/${exhibitionId}`, { method: "POST", body });

export const updateDesign = ({ id, ...body }: { id: string; option_no?: number; remarks?: string }) =>
  api(`updatedesign/${id}`, { method: "PUT", body });

export const deleteDesign = (id: string) => api(`deletedesign/${id}`, { method: "DELETE" });

export const makeDesignFinal = (id: string) => api(`finaldesign/${id}`, { method: "PATCH" });
