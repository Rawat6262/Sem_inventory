"use client";

// Reports module: read-only, admin-only roll-ups built entirely from data the
// other modules already produce — nothing here is created or edited. Four
// sections: a business-wide money timeline (GET /project/summary), a
// per-exhibition drill-down (GET /exhibition/:id/summary, already used
// nowhere else in the frontend yet), a cross-warehouse stock overview (a new
// backend endpoint, GET /reports/stock-overview — the only genuinely missing
// aggregate), and client payment summaries (GET /summary/all and
// GET /:clientId/payment-report). Every call goes through the /api/backend proxy.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const reportKeys = {
  all: ["reports"] as const,
  timeline: (year: number | null) => ["reports", "timeline", year] as const,
  monthDetail: (year: number, month: number) => ["reports", "month-detail", year, month] as const,
  exhibitionSummary: (id: string) => ["reports", "exhibition-summary", id] as const,
  stockOverview: ["reports", "stock-overview"] as const,
  clientsSummary: ["reports", "clients-summary"] as const,
  clientPaymentReport: (id: string) => ["reports", "client-payment-report", id] as const,
};

// ── MONEY: business-wide timeline + one month's full detail ────────────────

export type MonthRow = {
  year: number;
  month: number;
  month_name: string;
  expense_recorded: number;
  expense_paid: number;
  revenue_collected: number;
  payment_count: number;
  outgoing_challans: number;
  outgoing_quantity: number;
  incoming_challans: number;
  incoming_quantity: number;
  incoming_lost: number;
  incoming_dead: number;
  profit_actual: number;
  outgoing_goods_value: number; // "Total value of goods" written on the challans
  purchase_count: number; // stock purchases dated this month
  purchase_amount: number;
  purchase_pending: number; // of those, not received into stock yet
  rejected_leads: number;
  new_clients: number;
};

export function useProjectTimeline(year: number | null) {
  return useQuery({
    queryKey: reportKeys.timeline(year),
    queryFn: async () => (await api<{ data: MonthRow[] }>(`project/summary${year ? `?year=${year}` : ""}`)).data,
  });
}

export type ExpensePurpose = { purpose: string; amount: number };
export type ExpensePerson = { id: string; name: string; exhibitions: string[]; recorded: number; paid: number; purposes: ExpensePurpose[] };
export type ExpenseCategoryDetail = { people: ExpensePerson[]; totals: { recorded: number; paid: number } };

export type MonthDetail = {
  filter: { year: number; month: number; month_name: string };
  data: {
    exhibitions: {
      started: { _id: string; name: string; venue?: string; startDate: string; endDate: string }[];
      ended: { _id: string; name: string; venue?: string; startDate: string; endDate: string }[];
      active: { _id: string; name: string; venue?: string; startDate: string; endDate: string }[];
    };
    revenue: {
      collected: number;
      payment_count: number;
      payments: { client_name: string; company_name: string | null; exhibition_name: string; field: string; amount: number; date: string }[];
    };
    expenses: {
      recorded: number;
      paid: number;
      by_category: { labour: ExpenseCategoryDetail; transporter: ExpenseCategoryDetail; supervisor: ExpenseCategoryDetail; vendor: ExpenseCategoryDetail };
    };
    profit: { actual: number };
    logistics: {
      outgoing: { totals: { total_challans: number; total_quantity: number; goods_value: number }; challans: unknown[] };
      incoming: { totals: { total_challans: number; total_quantity: number; total_received: number; total_lost: number; total_dead: number; goods_value: number }; challans: unknown[] };
    };
    new_clients: { count: number; clients: { id: string; name: string; company: string | null; phone: string }[] };
    purchases: {
      totals: { count: number; amount: number; received_count: number; received_amount: number; pending_count: number; pending_amount: number };
      received_into_stock: { count: number; units: number; amount: number };
      top_vendor: { name: string; amount: number } | null;
      purchases: PurchaseReportRow[];
    };
    rejected_leads: { count: number; lost_deal_value: number; leads: RejectedLeadRow[] };
    highlights: string[];
  };
  notes: string[];
};

export type PurchaseReportRow = {
  id: string;
  purchase_number: string;
  date: string;
  vendor_name: string;
  purchased_by: string;
  warehouse_name: string;
  item_count: number;
  units: number;
  total_amount: number;
  status: "pending" | "received";
};

export type RejectedLeadRow = {
  id: string;
  company: string | null;
  name: string;
  reason: string;
  rejected_by: string | null;
  rejected_at: string;
  lost_deal_value: number;
};

export function useProjectMonthDetail(year: number | null, month: number | null) {
  return useQuery({
    queryKey: reportKeys.monthDetail(year ?? 0, month ?? 0),
    queryFn: async () => api<MonthDetail>(`project/summary?year=${year}&month=${month}`),
    enabled: year != null && month != null,
  });
}

// ── EXHIBITIONS: per-exhibition full summary ────────────────────────────────

export { useExhibitionsList, type ExhibitionRef } from "@/lib/contractors";

export type ExhibitionMoneySection = {
  people: { id: string; name: string | null; expense_amount: number; expense_purposes: ExpensePurpose[]; deal_amount: number; pending_amount: number; purposes: ExpensePurpose[] }[];
  totals: { expense_amount: number; deal_amount: number; pending_amount: number };
};

export type ExhibitionVendorSection = {
  people: { id: string; name: string | null; total_amount: number; paid_amount: number; purposes: ExpensePurpose[] }[];
  totals: { total_amount: number; paid_amount: number };
};

export type ExhibitionSummary = {
  exhibition: { id: string; name: string; venue?: string; organiser?: string; startDate: string; endDate: string; country?: string; state?: string; city?: string };
  warehouseProducts: {
    byWarehouse: { warehouse_id: string; warehouse_name: string; products: { product_id: string; product_name: string; total_sent: number; total_returned: number; lost: number; dead: number; still_pending: number }[] }[];
    totals: { total_sent: number; total_returned: number; total_lost: number; total_dead: number; still_pending: number };
  };
  labour: ExhibitionMoneySection;
  transporter: ExhibitionMoneySection;
  supervisor: ExhibitionMoneySection;
  vendor: ExhibitionVendorSection;
  client: {
    clients: { client_id: string; name: string; company?: string; phone?: string; total_deal_amount: number; total_paid: number; total_remaining: number }[];
    totals: { total_deal_amount: number; total_paid: number; total_remaining: number };
  };
  overall: {
    revenue_billed: number;
    revenue_collected: number;
    expense_agreed: number;
    expense_recorded: number;
    profit_projected: number;
    profit_actual: number;
    product_loss_units: { lost: number; dead: number; still_pending: number };
    notes: string[];
  };
};

export function useExhibitionSummary(id: string) {
  return useQuery({
    queryKey: reportKeys.exhibitionSummary(id),
    queryFn: async () => (await api<{ data: ExhibitionSummary }>(`exhibition/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

// ── STOCK: cross-warehouse overview ─────────────────────────────────────────

export type WarehouseStockRow = {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_no: number;
  product_count: number;
  no_of_item: number;
  repair_item: number;
  out_for_exhibition: number;
  lost: number;
  dead: number;
  total_no: number;
};

export type LowStockRow = { product_id: string; product_name: string; category?: string; warehouse_id: string; warehouse_name: string; no_of_item: number; total_no: number };

export type StockOverview = {
  totals: Omit<WarehouseStockRow, "warehouse_id" | "warehouse_name" | "warehouse_no">;
  warehouses: WarehouseStockRow[];
  low_stock: LowStockRow[];
  low_stock_threshold: number;
  purchases: {
    pending_count: number;
    pending_amount: number;
    pending_units: number;
    pending: { id: string; purchase_number: string; date: string; vendor_name: string; warehouse_name: string; units: number; total_amount: number }[];
    received_last_30_days: { count: number; units: number; amount: number };
  };
};

export function useStockOverview() {
  return useQuery({
    queryKey: reportKeys.stockOverview,
    queryFn: async () => (await api<{ data: StockOverview }>("reports/stock-overview")).data,
  });
}

// ── CLIENTS: payment summaries ───────────────────────────────────────────────

export type ClientSummaryRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  exhibitions_count: number;
  stalls_count: number;
  total_deal_amount: number;
  total_paid: number;
  added_by: string | null;
  created_at: string;
  status: "lead" | "final" | "fully_paid" | "rejected";
  rejected: boolean;
  reject_reason: string;
  rejected_by: string | null;
  rejected_at: string | null;
  lost_deal_value: number; // what a rejected lead's deal was worth
};

export function useClientsSummary() {
  return useQuery({
    queryKey: reportKeys.clientsSummary,
    queryFn: async () => {
      const res = await api<{ data: ClientSummaryRow[] }>("summary/all");
      return [...res.data].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export type ClientPaymentReport = {
  client: { name: string; company: string | null; id: string };
  exhibitions: {
    exhibition_name: string;
    exhibition_id: string;
    stalls_count: number;
    financial_summary: { deal_amount: number; paid: number; remaining: number; paid_percentage: string | number };
    stall_details: { stall_no: string; stall_name: string; deal_amount: number; paid: number; remaining: number; status: string }[];
  }[];
  summary: { total_exhibitions: number; total_stalls: number; grand_deal_amount: number; grand_paid: number; grand_remaining: number };
};

export function useClientPaymentReport(clientId: string) {
  return useQuery({
    queryKey: reportKeys.clientPaymentReport(clientId),
    queryFn: async () => (await api<{ data: ClientPaymentReport }>(`${clientId}/payment-report`)).data,
    enabled: Boolean(clientId),
  });
}
