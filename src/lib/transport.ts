"use client";

// Transport module: transporters, the freight/trip charges agreed with them
// (DealAmount, like contractors' expenses — but with a vehicle number) and
// what's actually been paid (Transactions, category "transporter"). No
// stalls — transporters just have a flat list of exhibitions, like
// supervisors. Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useExhibitionsList, type DealPurpose, type ExhibitionRef } from "@/lib/contractors";

export { useExhibitionsList, type DealPurpose, type ExhibitionRef };

export const PAYMENT_MODES = ["cash", "upi", "netbanking", "other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type TransporterTransaction = {
  _id: string;
  exhibition_name?: string;
  category: string;
  purposes: DealPurpose[];
  payment_mode: string;
  remark: string;
  transaction_date: string;
  transporter_name?: string;
  vehicle_number?: string;
  total_amount: number;
  paid_amount: number;
  createdAt: string;
};

export type Transporter = {
  _id: string;
  transporter_name: string;
  country: string;
  state: string;
  city: string;
  address: string;
  phone_number: string;
  payment: string;
  exhibition: ExhibitionRef[];
  transactions: TransporterTransaction[];
  overall_total?: number;
  overall_paid?: number;
};

export type TransportSummaryEntry = {
  exhibition_id: string;
  exhibition_name: string | null;
  deal_amount: number; // agreed (DealAmount, with a vehicle number)
  recorded_amount: number; // actually paid, via Transactions
  pending_amount: number; // deal_amount − recorded_amount
  purposes: DealPurpose[];
};

export type TransportSummary = {
  transporter: { id: string; name: string; phone_number: string };
  byExhibition: TransportSummaryEntry[];
  totals: { deal_amount: number; recorded_amount: number; pending_amount: number };
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const transportKeys = {
  all: ["transport"] as const,
  list: ["transport", "list"] as const,
  summary: (id: string) => ["transport", "summary", id] as const,
};

export function useTransporters() {
  return useQuery({
    queryKey: transportKeys.list,
    queryFn: async () => {
      const res = await api<{ data: Transporter[] }>("gettransporter");
      return [...res.data].sort((a, b) => a.transporter_name.localeCompare(b.transporter_name));
    },
  });
}

export function useTransporterSummary(id: string) {
  return useQuery({
    queryKey: transportKeys.summary(id),
    queryFn: async () => (await api<{ data: TransportSummary }>(`transporter/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

export function useTransportMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: transportKeys.all }),
  });
}

export type TransporterInput = {
  transporter_name: string;
  phone_number: string;
  country: string;
  state: string;
  city: string;
  address: string;
  payment?: string;
};

export const saveTransporter = ({ id, ...body }: TransporterInput & { id?: string }) =>
  id ? api(`updatetransporter/${id}`, { method: "PUT", body }) : api("createtransporter", { method: "POST", body });

export const deleteTransporter = (id: string) => api(`deletetransporter/${id}`, { method: "DELETE" });

export type TripChargeInput = { exhibition: string; transporter: string; purposes: DealPurpose[]; vehicleNo?: string; remarks?: string };
export const addTripCharge = (body: TripChargeInput) => api("createDealAmount", { method: "POST", body });

export type TransportPaymentInput = { exhibition: string; transporter: string; purposes: DealPurpose[]; vehicle_number?: string; remark: string };
export const recordTransportPayment = (body: TransportPaymentInput) =>
  api("createtransaction", { method: "POST", body: { category: "transporter", payment_mode: "cash", ...body } });
