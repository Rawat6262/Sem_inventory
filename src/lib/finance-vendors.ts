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

export type TaxableEntry = { _id: string; taxableAmount: number; rate: number; gst: number; date: string; createdBy?: string | null };
export type PaymentEntry = { _id: string; paidAmount: number; paidDate: string; createdBy?: string | null };

export type FinanceVendorDetails = {
  vendor: Vendor;
  summary: { taxableAmount: number; gstBalance: number; paidAmount: number; remainingBalance: number };
  taxableHistory: TaxableEntry[];
  paymentHistory: PaymentEntry[];
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

// GST often isn't a whole number of rupees, so paise are shown when there are any.
const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paiseFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n: number | null | undefined) => (Math.round((n ?? 0) * 100) % 100 ? paiseFormat : moneyFormat).format(n ?? 0);

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

/** Fix an entry that was added wrong. Refused when it would leave less GST payable than was paid. */
export const updateTaxableEntry = ({ vendor, entryId, ...body }: TaxableEntryInput & { entryId: string }) =>
  api(`financeVendorEntry/${vendor}/${entryId}`, { method: "PUT", body });

/** Deleting the last entry of a ledger with no payments deletes the ledger too. */
export const deleteTaxableEntry = ({ vendorId, entryId }: { vendorId: string; entryId: string }) =>
  api(`financeVendorEntry/${vendorId}/${entryId}`, { method: "DELETE" });

/** Fix a payment that was recorded wrong. The ledger's totals are worked out again. */
export const updateFinanceVendorPayment = ({ vendorId, paymentId, ...body }: VendorPaymentInput & { paymentId: string }) =>
  api(`financeVendorPayment/${vendorId}/${paymentId}`, { method: "PUT", body });

export const deleteFinanceVendorPayment = ({ vendorId, paymentId }: { vendorId: string; paymentId: string }) =>
  api(`financeVendorPayment/${vendorId}/${paymentId}`, { method: "DELETE" });
