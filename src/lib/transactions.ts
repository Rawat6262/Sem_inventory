"use client";

// Transactions module: the central ledger across all four payable
// categories (labour, transporter, supervisor, vendor). Creating a
// transaction records what's owed (an invoice); paid_amount stays 0 until a
// separate payment is applied against it — the backend tracks these as two
// different steps, and this module exposes both. Every call goes through
// the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DealPurpose } from "@/lib/contractors";

export { useExhibitionsList, type DealPurpose, type ExhibitionRef } from "@/lib/contractors";

export const TRANSACTION_CATEGORIES = ["labour", "transporter", "supervisor", "vendor"] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const PURPOSES = ["food", "loading", "unloading", "transportation", "other", "labour", "travel", "Stay", "Misc", "material"] as const;

export const PAYMENT_MODES = ["cash", "upi", "netbanking", "other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type TransactionStatus = "pending" | "partial" | "paid";

type Ref<T> = (T & { _id: string }) | null;

export type Transaction = {
  _id: string;
  exhibition: Ref<{ name: string; city?: string }>;
  exhibition_name?: string;
  category: TransactionCategory;
  purposes: DealPurpose[];
  labour: Ref<{ name: string; phone_number?: string | number }>;
  labour_name?: string;
  stall?: string | null;
  supervisor: Ref<{ full_name: string; mobile_number?: string | number }>;
  supervisor_name?: string;
  transporter: Ref<{ transporter_name: string; phone_number?: string }>;
  transporter_name?: string;
  vendor: Ref<{ vendorName: string; phoneNo?: string }>;
  vendor_name?: string;
  payment_mode: PaymentMode;
  remark: string;
  transaction_date: string;
  vehicle_number?: string | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: TransactionStatus;
  createdAt: string;
};

export function entityName(t: Transaction): string {
  switch (t.category) {
    case "labour":
      return t.labour_name ?? t.labour?.name ?? "Deleted contractor";
    case "transporter":
      return t.transporter_name ?? t.transporter?.transporter_name ?? "Deleted transporter";
    case "supervisor":
      return t.supervisor_name ?? t.supervisor?.full_name ?? "Deleted supervisor";
    case "vendor":
      return t.vendor_name ?? t.vendor?.vendorName ?? "Deleted vendor";
  }
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  labour: "Contractor",
  transporter: "Transporter",
  supervisor: "Supervisor",
  vendor: "Vendor",
};

export const STATUS_LABELS: Record<TransactionStatus, string> = { pending: "Pending", partial: "Partially paid", paid: "Paid" };

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const transactionKeys = {
  all: ["transactions"] as const,
  list: ["transactions", "list"] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};

export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Transaction[] }>("getalltransactions");
      return res.data;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => (await api<{ data: Transaction }>(`gettransactionbyid/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useTransactionsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}

export type NewTransactionInput = {
  exhibition: string;
  category: TransactionCategory;
  purposes: DealPurpose[];
  payment_mode: PaymentMode;
  remark: string;
  transaction_date?: string;
  vehicle_number?: string;
  labour?: string;
  stall?: string;
  supervisor?: string;
  transporter?: string;
  vendor?: string;
};
export const createTransaction = (body: NewTransactionInput) => api<{ data: Transaction }>("createtransaction", { method: "POST", body });

export type EditTransactionInput = {
  id: string;
  purposes: DealPurpose[];
  payment_mode: PaymentMode;
  remark: string;
  transaction_date?: string;
  vehicle_number?: string;
};
export const updateTransaction = ({ id, ...body }: EditTransactionInput) => api(`updatetransaction/${id}`, { method: "PUT", body });

export const deleteTransaction = (id: string) => api(`deletetransaction/${id}`, { method: "DELETE" });

export type AddPaymentInput = { id: string; amount: number; payment_mode?: PaymentMode };
export const addPayment = ({ id, ...body }: AddPaymentInput) => api(`updatetransactionpayment/${id}`, { method: "PUT", body });
