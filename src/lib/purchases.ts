"use client";

// Purchases module: what was bought, from which vendor, by whom, for which
// warehouse. Admin and employee users record purchases; anyone can mark one
// received, which is the only moment the items reach stock (added to the
// warehouse product with the same name, or created there as a new product).
// Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { stockKeys } from "@/lib/stock";

type Ref<T> = (T & { _id: string }) | null;

export type PurchaseStatus = "pending" | "received";

export type PurchaseItem = {
  _id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  price: number;
  product?: Ref<{ name: string; no_of_item: number; total_no?: number; unit: string }> | string;
  stock_action?: "added" | "created" | null;
};

export type Purchase = {
  _id: string;
  purchase_number: string;
  purchase_date: string;
  vendor: Ref<{ vendorName: string; category?: string }>;
  purchased_by: Ref<{ full_name: string; role: string }>;
  warehouse: Ref<{ name?: string; warehouseNo?: number; city?: string }>;
  items: PurchaseItem[];
  total_amount: number;
  remarks?: string;
  status: PurchaseStatus;
  received_by: Ref<{ full_name: string; role: string }>;
  received_at: string | null;
  createdBy: Ref<{ full_name: string; role: string }>;
  createdAt: string;
};

export type PurchaseUser = { _id: string; full_name: string; role: string };

export type PurchaseItemInput = { name: string; category: string; unit: string; quantity: number; price: number };
export type PurchaseInput = {
  vendor: string;
  purchased_by: string;
  warehouse: string;
  purchase_date: string;
  remarks?: string;
  items: PurchaseItemInput[];
};

export const purchaseKeys = {
  all: ["purchases"] as const,
  list: (status: PurchaseStatus | "all") => ["purchases", "list", status] as const,
  detail: (id: string) => ["purchases", "detail", id] as const,
  users: ["purchases", "users"] as const,
};

export function usePurchases(status: PurchaseStatus | "all") {
  return useQuery({
    queryKey: purchaseKeys.list(status),
    queryFn: async () => (await api<{ data: Purchase[] }>(status === "all" ? "purchase" : `purchase?status=${status}`)).data,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: async () => (await api<{ data: Purchase }>(`purchase/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });
}

/** People who can be picked as "purchased by" (admin and employee only). */
export function usePurchaseUsers(enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.users,
    queryFn: async () => (await api<{ data: PurchaseUser[] }>("purchase/users")).data,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Runs a purchase change, then refreshes purchases (and stock, which receiving changes). */
export function usePurchaseMutation<TInput, TResult = unknown>(fn: (input: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export const savePurchase = ({ id, ...body }: PurchaseInput & { id?: string }) =>
  id ? api<{ data: Purchase }>(`purchase/${id}`, { method: "PUT", body }) : api<{ data: Purchase }>("purchase", { method: "POST", body });

export const deletePurchase = (id: string) => api(`purchase/${id}`, { method: "DELETE" });

export const receivePurchase = (id: string) => api<{ data: Purchase }>(`purchase/${id}/receive`, { method: "POST" });

// ─── Helpers ───────────────────────────────────────────────────────────────

const refId = (r: { _id: string } | string | null | undefined) => (r && typeof r === "object" ? r._id : (r ?? ""));

/** Admin edits/deletes any pending purchase; employees only the ones they recorded. */
export function canChangePurchase(me: { _id: string; role: string }, p: Purchase) {
  if (p.status !== "pending") return false;
  if (me.role === "admin") return true;
  return me.role === "employee" && refId(p.createdBy) === me._id;
}

export const lineTotal = (it: { quantity: number; price: number }) => (Number(it.quantity) || 0) * (Number(it.price) || 0);
