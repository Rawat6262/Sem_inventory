"use client";

// Supervisors module: supervisors are users (SignupSem, role "supervisor"),
// not a separate record like contractors. There are no stalls or agreed
// amounts — just exhibitions they're linked to (added automatically the
// first time a payment or expense is recorded against them) and the
// payments/expenses themselves. Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DealPurpose } from "@/lib/contractors";

export { useExhibitionsList, type ExhibitionRef, type DealPurpose } from "@/lib/contractors";

export type SupervisorTransaction = {
  _id: string;
  exhibition_name?: string;
  category: string;
  purposes: DealPurpose[];
  payment_mode: string;
  remark: string;
  transaction_date: string;
  supervisor_name?: string;
  total_amount: number;
  paid_amount: number;
};

export type Supervisor = {
  _id: string;
  full_name: string;
  gmail: string;
  mobile_number: number | string;
  role: "supervisor";
  isapproved: boolean;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  exhibition: { _id: string; name: string; venue?: string; city?: string }[];
  transactions: SupervisorTransaction[];
};

export type SupervisorSummaryEntry = {
  exhibition_id: string;
  exhibition_name: string | null;
  expense_amount: number; // recorded expenses (DealAmount)
  expense_purposes: DealPurpose[];
  deal_amount: number; // actually paid, via Transactions
  pending_amount: number; // deal_amount − expense_amount
  purposes: DealPurpose[]; // breakdown of what was paid, by purpose
};

export type SupervisorSummary = {
  supervisor: { id: string; name: string; mobile_number: number | string; gmail: string };
  byExhibition: SupervisorSummaryEntry[];
  totals: { expense_amount: number; deal_amount: number; pending_amount: number };
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

/** Total paid across all of a supervisor's transactions (from the list response — no extra call). */
export function supervisorPaidTotal(s: Supervisor): number {
  return (s.transactions || []).reduce((sum, t) => sum + (t.total_amount || 0), 0);
}

export const supervisorKeys = {
  all: ["supervisors"] as const,
  list: ["supervisors", "list"] as const,
  detail: (id: string) => ["supervisors", "detail", id] as const,
  summary: (id: string) => ["supervisors", "summary", id] as const,
};

export function useSupervisors() {
  return useQuery({
    queryKey: supervisorKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Supervisor[] }>("getallsupervisor");
      return [...res.data].sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}

export function useSupervisor(id: string) {
  return useQuery({
    queryKey: supervisorKeys.detail(id),
    queryFn: async () => (await api<{ data: Supervisor }>(`getsupervisorbyid/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useSupervisorSummary(id: string) {
  return useQuery({
    queryKey: supervisorKeys.summary(id),
    queryFn: async () => (await api<{ data: SupervisorSummary }>(`supervisor/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

export function useSupervisorsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}

export type SupervisorExpenseInput = { exhibition: string; supervisor: string; purposes: DealPurpose[]; remarks?: string };
export const addSupervisorExpense = (body: SupervisorExpenseInput) => api("createDealAmount", { method: "POST", body });

export type SupervisorPaymentInput = { exhibition: string; supervisor: string; purposes: DealPurpose[]; remark: string };
export const recordSupervisorPayment = (body: SupervisorPaymentInput) =>
  api("createtransaction", { method: "POST", body: { category: "supervisor", payment_mode: "cash", ...body } });
