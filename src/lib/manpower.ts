"use client";

// Manpower module: sub-labour workers (Person) and the day-wage/tender work
// payments recorded against them at exhibitions. Every call goes through
// the /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useExhibitionsList, type ExhibitionRef } from "@/lib/contractors";

export { useExhibitionsList, type ExhibitionRef };

export type Person = { _id: string; name: string; phone?: string; createdAt?: string };

export type WorkType = "DAY_WAGE" | "TENDER";

export type WorkPayment = {
  _id: string;
  exhibition: ExhibitionRef | string;
  person: string;
  personName: string;
  workType: WorkType;
  labourType?: string;
  wageDays?: number;
  stallName?: string;
  stallNo?: string;
  size?: number;
  rate: number;
  totalAmount: number;
  remarks?: string;
  createdBy?: { _id: string; full_name?: string; role?: string } | string;
  createdAt: string;
};

export type DayWageEntry = { _id: string; labourType?: string; wageDays: number; rate: number; total: number; remarks?: string; createdAt: string };
export type TenderEntry = { _id: string; stallName?: string; stallNo?: string; size: number; rate: number; total: number; remarks?: string; createdAt: string };

export type PersonHistoryEntry = {
  exhibition: { _id: string; name: string; venue?: string; startDate?: string; endDate?: string } | null;
  dayWage: DayWageEntry[];
  tender: TenderEntry[];
  exhibitionTotal: number;
  dayWageTotal: number;
  tenderTotal: number;
};

export type PersonHistory = { _id: string; name: string; phone?: string; grandTotal: number; history: PersonHistoryEntry[] };

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const WORK_TYPE_LABELS: Record<WorkType, string> = { DAY_WAGE: "Day wages", TENDER: "Tender (fixed)" };

export const manpowerKeys = {
  all: ["manpower"] as const,
  persons: ["manpower", "persons"] as const,
  history: (id: string) => ["manpower", "history", id] as const,
};

export function usePersons() {
  return useQuery({
    queryKey: manpowerKeys.persons,
    queryFn: async () => {
      const res = await api<{ data: Person[] }>("getallpersons");
      return [...res.data].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function usePersonHistory(id: string) {
  return useQuery({
    queryKey: manpowerKeys.history(id),
    queryFn: async () => (await api<{ data: PersonHistory }>(`getpersonhistory/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useManpowerMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: manpowerKeys.all }),
  });
}

export type PersonInput = { name: string; phone?: string };
export const savePerson = ({ id, ...body }: PersonInput & { id?: string }) =>
  id ? api(`updateperson/${id}`, { method: "PUT", body }) : api("createperson", { method: "POST", body });

export const deletePerson = (id: string) => api(`deleteperson/${id}`, { method: "DELETE" });

export type WorkPaymentInput = {
  id?: string;
  exhibition: string;
  person: string;
  workType: WorkType;
  rate: number;
  remarks?: string;
  labourType?: string;
  wageDays?: number;
  stallName?: string;
  stallNo?: string;
  size?: number;
  createdBy?: string;
};

export const saveWorkPayment = ({ id, ...body }: WorkPaymentInput) =>
  id ? api(`updateWorkPayment/${id}`, { method: "PUT", body }) : api("createWorkPayment", { method: "POST", body });

export const deleteWorkPayment = (id: string) => api(`deleteWorkPayment/${id}`, { method: "DELETE" });
