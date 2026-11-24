"use client";

// Vendors module: suppliers of goods (distinct from the separate Finance
// Vendors ledger module). Vendors have no agreed-deal amount — only what's
// actually been invoiced and paid, via Transactions (category "vendor").
// Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useExhibitionsList, type DealPurpose, type ExhibitionRef } from "@/lib/contractors";

export { useExhibitionsList, type DealPurpose, type ExhibitionRef };

export const VENDOR_CATEGORIES = ["Electronics", "Food", "Clothing", "Services", "Other", "Finance Vendor"] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export type VendorTransaction = {
  _id: string;
  exhibition_name?: string;
  category: string;
  purposes: DealPurpose[];
  payment_mode: string;
  remark: string;
  transaction_date: string;
  vendor_name?: string;
  total_amount: number;
  paid_amount: number;
};

export type Vendor = {
  _id: string;
  createdBy?: string | null;
  vendorName: string;
  category: string;
  phoneNo: string;
  email?: string;
  address?: string;
  exhibition?: ExhibitionRef[];
  transactions?: VendorTransaction[];
  createdAt?: string;
};

export type VendorSummaryEntry = {
  exhibition_id: string;
  exhibition_name: string | null;
  total_amount: number; // invoiced
  paid_amount: number;
  pending_amount: number; // total_amount − paid_amount
  purposes: DealPurpose[];
};

export type VendorSummary = {
  vendor: { id: string; name: string; category: string; phone: string; email?: string };
  byExhibition: VendorSummaryEntry[];
  totals: { total_amount: number; paid_amount: number; pending_amount: number };
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const vendorKeys = {
  all: ["vendors"] as const,
  list: ["vendors", "list"] as const,
  detail: (id: string) => ["vendors", "detail", id] as const,
  summary: (id: string) => ["vendors", "summary", id] as const,
};

export function useVendors() {
  return useQuery({
    queryKey: vendorKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Vendor[] }>("getvendor?limit=1000&sort=oldest");
      return [...res.data].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: async () => (await api<{ data: Vendor }>(`getvendorbyid/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useVendorSummary(id: string) {
  return useQuery({
    queryKey: vendorKeys.summary(id),
    queryFn: async () => (await api<{ data: VendorSummary }>(`vendor/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

export function useVendorsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorKeys.all }),
  });
}

export type VendorInput = { vendorName: string; category: string; phoneNo: string; email?: string; address?: string };

export const saveVendor = ({ id, ...body }: VendorInput & { id?: string }) =>
  id ? api(`updatevendor/${id}`, { method: "PUT", body }) : api("addvendor", { method: "POST", body });

export const deleteVendor = (id: string) => api(`deletevendor/${id}`, { method: "DELETE" });

export type VendorPaymentInput = { exhibition: string; vendor: string; purposes: DealPurpose[]; remark: string };

// A transaction is money already paid, so one call records the payment.
export const recordVendorPayment = (body: VendorPaymentInput) =>
  api("createtransaction", { method: "POST", body: { category: "vendor", payment_mode: "cash", ...body } });
