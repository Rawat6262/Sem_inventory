"use client";

// Stock module: types, queries and mutations for warehouses, products,
// categories and transfers. Every call goes through the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types (as the Express API returns them) ───────────────────────────────

export type Warehouse = {
  _id: string;
  warehouseNo?: number | null;
  name?: string | null;
  address: string;
  country: string;
  state: string;
  city: string;
  products?: string[];
};

export type Category = { _id: string; category: string };

export type Vendor = { _id: string; vendorName: string };

export const UNITS = ["pcs", "kg", "litre", "meter", "box", "packet", "dozen", "sqft.", "sqmtr.", "set", "roll", "pair", "other"] as const;
export type Unit = (typeof UNITS)[number];

export type Product = {
  _id: string;
  name: string;
  category: string; // usually a Category _id; older records may hold the name
  unit: string;
  no_of_item: number; // everything the company owns of this product here
  repair_item: number;
  out_for_exhibition: number;
  lost: number;
  dead: number;
  total_no?: number; // what's actually on the shelf right now
  vendor?: Vendor | string | null;
  warehouse?: string | null;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Ref<T> = (T & { _id: string }) | null;

export type Transfer = {
  _id: string;
  product: Ref<{ name: string; category?: string; unit?: string }>;
  fromWarehouse: Ref<{ name?: string; warehouseNo?: number }>;
  toWarehouse: Ref<{ name?: string; warehouseNo?: number }>;
  quantity: number;
  remark?: string;
  transferredBy?: Ref<{ full_name?: string; role?: string }>;
  createdAt: string;
};

export type StockTotals = {
  no_of_item: number;
  repair_item: number;
  out_for_exhibition: number;
  lost: number;
  dead: number;
  total_no: number;
};

export type WarehouseSummary = {
  warehouse: { id: string; name?: string; warehouseNo?: number; address: string; country: string; state: string; city: string };
  stockTotals: StockTotals;
  exhibitionActivity: {
    byExhibition: {
      exhibition_id: string;
      exhibition_name?: string;
      products: { product_id: string; product_name: string; total_sent: number; total_returned: number; lost: number; dead: number; still_pending: number }[];
    }[];
    totals: { total_sent: number; total_returned: number; total_lost: number; total_dead: number; still_pending: number };
    outgoingChallans: ChallanSummary[];
    incomingChallans: (ChallanSummary & { total_lost: number; total_dead: number })[];
  };
  transfers: {
    out: { product_name: string | null; quantity: number; to_warehouse: string | null; date: string; remark: string }[];
    in: { product_name: string | null; quantity: number; from_warehouse: string | null; date: string; remark: string }[];
    totals: { total_transferred_out: number; total_transferred_in: number };
  };
};

export type ChallanSummary = {
  document_number: string;
  date: string;
  exhibition_name?: string;
  vehicle_no?: string;
  transporter_name?: string;
  item_count: number;
  total_quantity: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Units on the shelf now. Falls back to the formula if the API left it out. */
export function available(p: Product): number {
  return p.total_no ?? p.no_of_item - p.repair_item - p.out_for_exhibition - p.lost - p.dead;
}

/** Units that can't be removed when editing the total: they're out, in repair, lost or dead. */
export function committed(p: Product): number {
  return p.repair_item + p.out_for_exhibition + p.lost + p.dead;
}

export function warehouseLabel(w: { name?: string | null; warehouseNo?: number | null; city?: string } | null | undefined): string {
  if (!w) return "No warehouse";
  const name = w.name?.trim() || (w.city ? `Warehouse in ${w.city}` : "Unnamed warehouse");
  return w.warehouseNo != null ? `${name} (#${w.warehouseNo})` : name;
}

export function categoryName(value: string | undefined | null, categories: Category[] | undefined): string {
  if (!value) return "Uncategorised";
  const match = categories?.find((c) => c._id === value || c.category.toLowerCase() === value.toLowerCase());
  return match?.category ?? value;
}

export function vendorName(v: Product["vendor"]): string | null {
  return v && typeof v === "object" ? v.vendorName : null;
}

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

// ─── Queries ───────────────────────────────────────────────────────────────

export const stockKeys = {
  all: ["stock"] as const,
  warehouses: ["stock", "warehouses"] as const,
  products: ["stock", "products"] as const,
  categories: ["stock", "categories"] as const,
  vendors: ["stock", "vendors"] as const,
  transfers: ["stock", "transfers"] as const,
  summary: (id: string) => ["stock", "warehouse", id, "summary"] as const,
};

export function useWarehouses() {
  return useQuery({
    queryKey: stockKeys.warehouses,
    queryFn: async () => {
      const list = await api<Warehouse[]>("warehouse");
      return [...list].sort((a, b) => (a.warehouseNo ?? Infinity) - (b.warehouseNo ?? Infinity));
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: stockKeys.products,
    queryFn: async () => (await api<{ data: Product[] }>("addproduct")).data,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: stockKeys.categories,
    queryFn: async () => {
      const { data } = await api<{ data: Category[] }>("category");
      return [...data].sort((a, b) => a.category.localeCompare(b.category));
    },
  });
}

export function useVendors() {
  return useQuery({
    queryKey: stockKeys.vendors,
    queryFn: async () => {
      const { data } = await api<{ data: Vendor[] }>("getvendor?limit=1000&sort=oldest");
      return [...data].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransfers() {
  return useQuery({
    queryKey: stockKeys.transfers,
    queryFn: async () => (await api<{ data: Transfer[] }>("transfer-history")).data,
  });
}

export function useWarehouseSummary(id: string) {
  return useQuery({
    queryKey: stockKeys.summary(id),
    queryFn: async () => (await api<{ data: WarehouseSummary }>(`warehouse/${id}/summary`)).data,
    enabled: Boolean(id),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

/** Runs a stock change, then refreshes everything stock-related. */
export function useStockMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: stockKeys.all }),
  });
}

export type WarehouseInput = {
  warehouseNo: number | null;
  name: string;
  address: string;
  country: string;
  state: string;
  city: string;
};

export const saveWarehouse = ({ id, ...body }: WarehouseInput & { id?: string }) =>
  id ? api(`warehouse/${id}`, { method: "PUT", body }) : api("warehouse", { method: "POST", body });

export const deleteWarehouse = (id: string) => api(`warehouse/${id}`, { method: "DELETE" });

export const saveCategory = ({ id, category }: { id?: string; category: string }) =>
  id ? api(`category/${id}`, { method: "PUT", body: { category } }) : api("category", { method: "POST", body: { category } });

export const deleteCategory = (id: string) => api(`category/${id}`, { method: "DELETE" });

export type ProductInput = {
  name: string;
  category: string;
  unit: string;
  no_of_item: number;
  warehouse: string;
  vendor?: string;
  remark?: string;
};

export const addProduct = (body: ProductInput) => api("addproduct", { method: "POST", body });

export const updateProduct = ({ id, ...body }: Partial<ProductInput> & { id: string }) =>
  api(`updateproduct/${id}`, { method: "PUT", body });

/** Moves units between the shelf and lost / dead / repair. */
export const PRODUCT_ACTIONS = {
  lost: { path: "lost", field: "lost", label: "Mark as lost", verb: "Mark lost" },
  "find-lost": { path: "find-lost", field: "found", label: "Found lost items", verb: "Return to stock" },
  dead: { path: "dead", field: "dead", label: "Mark as dead (damaged)", verb: "Mark dead" },
  repair: { path: "repair", field: "repair_item", label: "Send for repair", verb: "Send for repair" },
  "repair-return": { path: "repair-return", field: "returned", label: "Back from repair", verb: "Return to stock" },
} as const;
export type ProductAction = keyof typeof PRODUCT_ACTIONS;

/** Most units each action can move for this product. */
export function actionLimit(p: Product, action: ProductAction): number {
  if (action === "find-lost") return p.lost;
  if (action === "repair-return") return p.repair_item;
  return available(p);
}

export const runProductAction = ({ id, action, quantity, remark }: { id: string; action: ProductAction; quantity: number; remark: string }) => {
  const { path, field } = PRODUCT_ACTIONS[action];
  return api(`product/${id}/${path}`, { method: "PATCH", body: { [field]: quantity, remark } });
};

export type TransferInput = {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  transferredBy?: string;
};

export const transferProduct = (body: TransferInput) => api("transfer-product", { method: "POST", body });
