"use client";

// Finance Vendors module: a GST ledger, one per Vendor. Each "taxable entry"
// (an invoice amount + GST rate + date) adds to the GST payable (balance);
// payments reduce the remaining balance. This is purely a GST ledger — it
// has nothing to do with the payments tracked on the plain Vendors module.
// Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Vendor } from "@/lib/vendors";

export const GST_RATES = [0, 5, 12, 18] as const;

export type FinanceVendorListItem = {
  _id: string; // the FinanceVendor ledger's own id
  vendor: Vendor;
  taxableAmount: number;
  gstBalance: number;
  paidAmount: number;
  remainingBalance: number;
  totalTaxableEntries: number;
  totalPayments: number;
};

export type TaxableEntry = { _id: string; taxableAmount: number; rate: number; gst: number; date: string };
export type PaymentEntry = { _id: string; paidAmount: number; paidDate: string };

export type FinanceVendorDetails = {
  vendor: Vendor;
  summary: { taxableAmount: number; gstBalance: number; paidAmount: number; remainingBalance: number };
  taxableHistory: TaxableEntry[];
  paymentHistory: PaymentEntry[];
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const financeVendorKeys = {
  all: ["finance-vendors"] as const,
  list: ["finance-vendors", "list"] as const,
  details: (vendorId: string) => ["finance-vendors", "details", vendorId] as const,
};

export function useFinanceVendors() {
  return useQuery({
    queryKey: financeVendorKeys.list,
    queryFn: async () => {
      const res = await api<{ data: FinanceVendorListItem[] }>("getFinanceVendorList");
      return [...res.data].sort((a, b) => a.vendor?.vendorName.localeCompare(b.vendor?.vendorName ?? "") ?? 0);
    },
  });
}

export function useFinanceVendorDetails(vendorId: string) {
  return useQuery({
    queryKey: financeVendorKeys.details(vendorId),
    queryFn: async () => (await api<{ data: FinanceVendorDetails }>(`getFinanceVendorDetails/${vendorId}`)).data,
    enabled: Boolean(vendorId),
  });
}

export function useFinanceVendorsMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: financeVendorKeys.all }),
  });
}

export type TaxableEntryInput = { vendor: string; taxableAmount: number; rate: number; date: string };
export const addTaxableEntry = (body: TaxableEntryInput) => api("createFinanceVendor", { method: "POST", body });

export type VendorPaymentInput = { vendorId: string; paidAmount: number; paidDate: string };
export const addFinanceVendorPayment = ({ vendorId, ...body }: VendorPaymentInput) =>
  api(`addVendorPayment/payment/${vendorId}`, { method: "PUT", body });
