"use client";

// Activity module: read-only viewer for the audit trail every other module
// already writes to via logActivity() — no new backend work, this just
// surfaces GET /activity (admin-only; see utils/permissions.js ROUTE_MODULES).
// Every call goes through the /api/backend proxy.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"] as const;
export type ActivityAction = (typeof ACTIONS)[number];

// The exact module labels every controller's logActivity() call uses today —
// not an enum on the backend (new modules don't need a migration to start
// logging), so this list is just what's actually been seen in the codebase.
export const MODULES = [
  "Category",
  "Client",
  "DealAmount",
  "Design",
  "Employee",
  "Exhibition",
  "FinanceVendor",
  "IncomingChallan",
  "Labour",
  "OutgoingChallan",
  "Person",
  "Product",
  "ProductTransfer",
  "Quotation",
  "Transaction",
  "Transporter",
  "User",
  "Vendor",
  "Warehouse",
  "WorkPayment",
] as const;

export type ActivityLog = {
  _id: string;
  user: { _id: string; full_name?: string; gmail?: string; role?: string } | null;
  userName: string;
  action: ActivityAction;
  module: string;
  recordId: string | null;
  description: string;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ActivityFilters = {
  page: number;
  limit: number;
  module?: string;
  action?: ActivityAction;
  search?: string;
  startDate?: string;
  endDate?: string;
};

export const activityKeys = {
  all: ["activity"] as const,
  list: (f: ActivityFilters) => ["activity", "list", f] as const,
  detail: (id: string) => ["activity", "detail", id] as const,
};

export function useActivityLog(filters: ActivityFilters) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      params.set("limit", String(filters.limit));
      if (filters.module) params.set("module", filters.module);
      if (filters.action) params.set("action", filters.action);
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      return api<{ data: ActivityLog[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
        `activity?${params.toString()}`,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useActivityById(id: string | null) {
  return useQuery({
    queryKey: activityKeys.detail(id ?? ""),
    queryFn: async () => (await api<{ data: ActivityLog }>(`activity/${id}`)).data,
    enabled: Boolean(id),
  });
}

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (d: string | null | undefined) => (d ? dateTimeFormat.format(new Date(d)) : "—");
