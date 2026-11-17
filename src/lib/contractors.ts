"use client";

// Contractors module: labour contractors, the exhibitions/stalls they're
// booked for, their recorded expenses (deal amounts) and sub-labour work
// payments. Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types (as the Express API returns them) ───────────────────────────────

export type StallType = "WAGES" | "TENDER";

export type Stall = {
  _id: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
  stallType: StallType;
  person?: string | { _id: string; name: string; phone?: string } | null;
  person_name?: string;
  wageDays?: number;
  pms?: number;
  rate: number;
  remarks?: string;
  agreement_amount: number;
  paid_amount: number;
  remaining_amount: number;
  history_dates?: string[];
};

export type ExhibitionRef = { _id: string; name: string; venue?: string; city?: string; startDate?: string; endDate?: string };

export type LabourExhibitionEntry = {
  _id: string;
  exhibition: ExhibitionRef | string;
  stalls: Stall[];
  total_agreement_amount: number;
  total_paid: number;
  total_remaining: number;
};

export type Contractor = {
  _id: string;
  name: string;
  phone_number: number | string;
  address: string;
  labour_type: string;
  exhibition: LabourExhibitionEntry[];
  transactions?: string[];
  createdBy?: string | null;
};

export type Person = { _id: string; name: string; phone?: string };

export type DealPurpose = { purpose: string; amount: number };

export type DealAmount = {
  _id: string;
  exhibition: ExhibitionRef | string;
  labour?: string | { _id: string; name: string };
  purposes: DealPurpose[];
  vehicleNo?: string;
  remarks?: string;
  totalAmount: number;
  createdAt: string;
};

export type ContractorSummaryEntry = {
  exhibition_id: string;
  exhibition_name: string | null;
  expense_amount: number;
  expense_purposes: DealPurpose[];
  deal_amount: number; // money actually paid via transactions
  pending_amount: number;
  purposes: DealPurpose[];
  stalls: Stall[];
  total_agreement_amount: number;
  total_paid: number;
  total_remaining: number;
};

export type ContractorSummary = {
  labour: { id: string; name: string; phone_number: number | string; address: string; labour_type: string };
  byExhibition: ContractorSummaryEntry[];
  totals: {
    expense_amount: number;
    deal_amount: number;
    pending_amount: number;
    total_agreement_amount: number;
    total_paid: number;
    total_remaining: number;
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export function exhibitionRefName(e: LabourExhibitionEntry["exhibition"]): string {
  return typeof e === "object" ? e.name : "Exhibition";
}
export function exhibitionRefId(e: LabourExhibitionEntry["exhibition"]): string {
  return typeof e === "object" ? e._id : e;
}
export function personName(p: Stall["person"], fallback?: string): string {
  if (p && typeof p === "object") return p.name;
  return fallback ?? "—";
}

/** Totals for one contractor across every exhibition/stall they have. */
export function contractorTotals(c: Contractor) {
  return c.exhibition.reduce(
    (acc, e) => ({
      agreement: acc.agreement + (e.total_agreement_amount || 0),
      paid: acc.paid + (e.total_paid || 0),
      remaining: acc.remaining + (e.total_remaining || 0),
      stalls: acc.stalls + e.stalls.length,
    }),
    { agreement: 0, paid: 0, remaining: 0, stalls: 0 },
  );
}

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const STALL_TYPE_LABELS: Record<StallType, string> = { WAGES: "Day wages", TENDER: "Tender (fixed)" };

// ─── Queries ───────────────────────────────────────────────────────────────

export const contractorKeys = {
  all: ["contractors"] as const,
  list: ["contractors", "list"] as const,
  detail: (id: string) => ["contractors", "detail", id] as const,
  summary: (id: string) => ["contractors", "summary", id] as const,
  persons: ["contractors", "persons"] as const,
  exhibitions: ["contractors", "exhibitions"] as const,
};

export function useContractors() {
  return useQuery({
    queryKey: contractorKeys.list,
    queryFn: async () => {
      const list = await api<{ labours: Contractor[] }>("getlabours");
      return [...list.labours].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useContractor(id: string) {
  return useQuery({
    queryKey: contractorKeys.detail(id),
    queryFn: async () => (await api<{ labour: Contractor }>(`getlabourbyid/${id}`)).labour,
    enabled: Boolean(id),
  });
}

export function useContractorSummary(id: string) {
  return useQuery({
    queryKey: contractorKeys.summary(id),
    queryFn: async () => (await api<{ data: ContractorSummary }>(`labour/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

/** Exhibitions pick list: every logged-in role can read this. */
export function useExhibitionsList() {
  return useQuery({
    queryKey: contractorKeys.exhibitions,
    queryFn: async () => {
      const res = await api<{ data: ExhibitionRef[] }>("getexhibitions");
      return [...res.data].sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Sub-labour workers (Manpower module), used to pick who did a WAGES stall. */
export function usePersons() {
  return useQuery({
    queryKey: contractorKeys.persons,
    queryFn: async () => {
      const res = await api<{ data: Person[] }>("getallpersons");
      return [...res.data].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useContractorsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export type ContractorInput = { name: string; phone_number: number; address: string; labour_type: string };

export const saveContractor = ({ id, ...body }: ContractorInput & { id?: string }) =>
  id ? api(`updatelabour/${id}`, { method: "PUT", body }) : api("addlabour", { method: "POST", body });

export const deleteContractor = (id: string) => api(`deletelabour/${id}`, { method: "DELETE" });

export const addExhibitionToContractor = ({ labourId, exhibitionId }: { labourId: string; exhibitionId: string }) =>
  api(`labour/${labourId}/exhibitions/${exhibitionId}`, { method: "POST" });

export const removeExhibitionFromContractor = ({ labourId, exhibitionId }: { labourId: string; exhibitionId: string }) =>
  api(`labour/${labourId}/exhibitions/${exhibitionId}`, { method: "DELETE" });

export type StallInput = {
  labourId: string;
  exhibitionId: string;
  stallId?: string;
  stall_no?: string;
  stall_name?: string;
  stall_size?: string;
  stallType: StallType;
  remarks?: string;
  person?: string;
  wageDays?: number;
  pms?: number;
  rate: number;
};

export const saveStall = ({ labourId, exhibitionId, stallId, ...body }: StallInput) =>
  stallId
    ? api(`labour/${labourId}/exhibitions/${exhibitionId}/stalls/${stallId}`, { method: "PATCH", body })
    : api(`labour/${labourId}/exhibitions/${exhibitionId}/stalls`, { method: "POST", body });

export const removeStall = ({ labourId, exhibitionId, stallId }: { labourId: string; exhibitionId: string; stallId: string }) =>
  api(`labour/${labourId}/exhibitions/${exhibitionId}/stalls/${stallId}`, { method: "DELETE" });

export type DealAmountInput = {
  exhibition: string;
  labour: string;
  purposes: DealPurpose[];
  vehicleNo?: string;
  remarks?: string;
};

export const addDealAmount = (body: DealAmountInput) => api("createDealAmount", { method: "POST", body });

/** Records a payment against one stall (goes through the Transactions API). */
export type StallPaymentInput = {
  exhibition: string;
  labour: string;
  stall: string;
  purposes: DealPurpose[];
  payment_mode?: string;
  remark: string;
};

export const recordStallPayment = (body: StallPaymentInput) =>
  api("createtransaction", { method: "POST", body: { category: "labour", payment_mode: "cash", ...body } });
