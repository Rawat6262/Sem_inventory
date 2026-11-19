"use client";

// Outgoing and Incoming challans: delivery documents for stock leaving a
// warehouse for an exhibition, and stock coming back from one. There's no
// "list everything" endpoint — only a monthly browser, a keyword search,
// and a lookup by one warehouse+exhibition pair (the last of which the
// Stock module's warehouse page already shows, so it isn't repeated here).
// Creating either kind of challan also books a trip charge for the
// transporter (the same DealAmount purposes used in the Transport module).
// Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DealPurpose, ExhibitionRef } from "@/lib/contractors";

export { useExhibitionsList, type DealPurpose } from "@/lib/contractors";

type Ref<T> = (T & { _id: string }) | null;

export type PendingItem = { product_id: string; product_name: string; total_sent: number; pending_quantity: number };
export type PendingDocument = {
  exhibition_id: ExhibitionRef | string;
  exhibition_name: string;
  warehouse_id: Ref<{ name?: string; warehouseNo?: number }>;
  warehouse_name: string;
  items: PendingItem[];
};

export type OutgoingItemInput = { item_id: string; quantity: number; hsn_code?: string; remark?: string };
export type IncomingItemInput = { item_id: string; quantity: number; lost?: number; dead?: number; remark?: string };

export type ChallanItem = { item_id: string; item_name: string; quantity: number; received_quantity: number; lost?: number; dead?: number; remark: string };

export type Challan = {
  _id: string;
  document_number: string;
  date: string;
  exhibition_id: Ref<{ name: string; venue?: string }>;
  exhibition_name: string;
  exhibition_venue: string;
  from_warehouse: Ref<{ name?: string; warehouseNo?: number }>;
  from_warehouse_name: string;
  return_address?: string; // incoming only
  transporter_id: Ref<{ transporter_name: string }>;
  transporter_name: string;
  vehicle_no: string;
  items: ChallanItem[];
  createdAt: string;
  readOnly?: boolean; // supervisors: someone else's challan (id + a few fields only)
};

export type MonthRow = {
  year: number;
  month: number;
  month_name: string;
  total_challans: number;
  total_items: number;
  total_quantity: number;
  total_received: number;
  total_lost?: number;
  total_dead?: number;
};

export type MonthChallanRow = {
  _id?: string;
  readOnly?: boolean; // supervisors: someone else's challan, can't be opened
  document_number: string;
  date: string;
  exhibition_name: string;
  from_warehouse_name: string;
  vehicle_no: string;
  transporter_name: string;
  item_count: number;
  total_quantity: number;
  total_received: number;
  total_lost?: number;
  total_dead?: number;
};

export type MonthDetail = {
  filter: { year: number; month: number; month_name: string };
  summary: { total_challans: number; total_items: number; total_quantity: number; total_received: number; total_lost?: number; total_dead?: number };
  challans: MonthChallanRow[];
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export type Direction = "outgoing" | "incoming";
const paths = (dir: Direction) => ({
  create: dir === "outgoing" ? "createoutgoingdocument" : "createincomingdocument",
  search: dir === "outgoing" ? "searchoutgoingchallan" : "searchincomingchallan",
  summary: dir === "outgoing" ? "outgoing-challan/monthly-summary" : "incoming-challan/monthly-summary",
});

export const challanKeys = {
  all: (dir: Direction) => ["challans", dir] as const,
  monthly: (dir: Direction) => ["challans", dir, "monthly"] as const,
  month: (dir: Direction, y: number, m: number) => ["challans", dir, "month", y, m] as const,
  pending: (warehouseId: string, exhibitionId: string) => ["challans", "pending", warehouseId, exhibitionId] as const,
};

export function useMonthlySummary(dir: Direction) {
  return useQuery({
    queryKey: challanKeys.monthly(dir),
    queryFn: async () => (await api<{ data: MonthRow[] }>(paths(dir).summary)).data,
  });
}

export function useMonthDetail(dir: Direction, year: number | null, month: number | null) {
  return useQuery({
    queryKey: challanKeys.month(dir, year ?? 0, month ?? 0),
    queryFn: async () => api<MonthDetail>(`${paths(dir).summary}?year=${year}&month=${month}`),
    enabled: year != null && month != null,
  });
}

export function useSearchChallans(dir: Direction) {
  return useMutation({
    mutationFn: (keyword: string) => api<{ total: number; data: Challan[] }>(paths(dir).search, { method: "POST", body: { keyword } }),
  });
}

export function usePendingItems(warehouseId: string, exhibitionId: string) {
  return useQuery({
    queryKey: challanKeys.pending(warehouseId, exhibitionId),
    queryFn: async () => (await api<{ data: PendingDocument }>(`getpendingdocument/${warehouseId}/${exhibitionId}`)).data,
    enabled: Boolean(warehouseId && exhibitionId),
    retry: false,
  });
}

export function useChallanMutation<TInput, TResult = unknown>(dir: Direction, fn: (input: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: challanKeys.all(dir) }),
  });
}

export type NewOutgoingInput = {
  exhibition_id: string;
  from_warehouse: string;
  transporter_id: string;
  vehicle_no: string;
  items: OutgoingItemInput[];
  purposes: DealPurpose[];
  remarks?: string;
  goods_value?: number; // "Total value of goods" on the printed challan
};
export const createOutgoingChallan = (body: NewOutgoingInput) => api<{ data: Challan }>("createoutgoingdocument", { method: "POST", body });

// ─── Printable challan (letter + delivery challan, 2 A4 pages) ─────────────
// Outgoing: transport letter. Incoming: return letter, plus the warehouse the
// goods are going back to.

export type PrintableChallan = {
  _id: string;
  document_number: string;
  date: string;
  exhibition_name: string;
  exhibition_venue: string;
  exhibition_date: string;
  exhibition_endingdate: string;
  gst_number?: string;
  vehicle_no: string;
  goods_value?: number | null;
  exhibition: { name: string; venue: string; city: string; state: string; zipCode: string } | null;
  warehouse?: { address: string; city: string; state: string }; // incoming only
  items: { item_id: string; item_name: string; quantity: number; received_quantity?: number; unit: string; hsn_code: string }[];
};

/** Page that shows (and prints) the 2-page A4 sheet for one challan. */
export const challanPrintHref = (dir: Direction, id: string, autoPrint = false) => `/print/${dir}/${id}${autoPrint ? "?print=1" : ""}`;

export function useChallanPrint(dir: Direction, id: string) {
  return useQuery({
    queryKey: ["challans", dir, "print", id] as const,
    queryFn: async () => (await api<{ data: PrintableChallan }>(`${dir}-challan-print/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });
}

export type NewIncomingInput = {
  exhibition_id: string;
  from_warehouse: string;
  transporter_id: string;
  vehicle_no: string;
  items: IncomingItemInput[];
  purposes: DealPurpose[];
  remarks?: string;
  goods_value?: number; // "Total value of goods" on the printed challan
};
export const createIncomingChallan = (body: NewIncomingInput) => api<{ data: Challan }>("createincomingdocument", { method: "POST", body });
