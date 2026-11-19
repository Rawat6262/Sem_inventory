"use client";

// Employees module: people on staff, their leave, salary and sales
// targets. Pay, bank details and ID documents are stripped by the backend
// for anyone who isn't admin/account and isn't viewing their own record —
// those fields simply won't be present on this type for them. A few salary
// fields (leave_count, per_day_salary, generated_at) are computed and
// returned once when a salary is generated, but the backend's Salary model
// doesn't actually declare them, so they don't survive being saved — don't
// expect them on records read back later. Every call goes through the
// /api/backend proxy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const GENDERS = ["male", "female", "other"] as const;
export const EMPLOYEE_STATUSES = ["active", "inactive", "terminated"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export type AccountDetails = { bank_name?: string; account_number?: string; ifsc_code?: string; upi_id?: string };
export type IncrementHistoryEntry = { amount: number; previous_salary: number; new_salary: number; updated_at: string };

export type Employee = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  joining_date: string;
  company: string;
  status: EmployeeStatus;
  // Present only for admin/account, or the employee viewing their own record.
  current_salary?: number;
  increment?: number;
  increment_history?: IncrementHistoryEntry[];
  account_details?: AccountDetails;
  pan_card?: string;
  aadhaar_card?: string;
  photo?: string;
  createdBy?: string | null;
};

export const LEAVE_TYPES = ["paid", "unpaid", "sick", "casual"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export type LeaveRecord = { _id?: string; employee: string | { _id: string; name: string }; month: number; year: number; leave_dates: string[]; leave_count: number; leave_type?: LeaveType; reason?: string };

export type SalaryRecord = {
  _id: string;
  month: number;
  year: number;
  base_salary: number;
  increment: number;
  leave_deduction: number;
  final_salary: number;
  payment_status: "pending" | "paid";
  payment_date?: string;
  remarks?: string;
  // Computed at generation time; not actually persisted (see module note above).
  leave_count?: number;
  per_day_salary?: number;
};

export type SalaryHistory = {
  employee: { id: string; name: string; phone?: string; current_salary?: number };
  summary: { total_records: number; total_paid: number; total_deductions: number; total_increments: number };
  salaries: SalaryRecord[];
};

export type MonthlyReportEntry = {
  month: number;
  monthName: string;
  year: number;
  target: number;
  achieved: number;
  remaining: number;
  overAchieved: number;
  completionPercent: string;
  performanceStatus: string;
  remarks: string;
  lastUpdated: string;
};

export type YearlyReport = {
  employee: { id: string; name: string; email?: string };
  yearlySummary: {
    year: string | number;
    totalMonthsReported: number;
    totalTarget: number;
    totalAchieved: number;
    totalRemaining: number;
    overallCompletionPercent: string;
    monthsTargetAchieved: number;
    monthsTargetMissed: number;
    overallGrade: string;
    bestMonth: { month: string; completionPercent: string; achieved: number; target: number };
    worstMonth: { month: string; completionPercent: string; achieved: number; target: number };
  };
  monthlyBreakdown: MonthlyReportEntry[];
};

const numberFormat = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => numberFormat.format(n ?? 0);

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDate = (d: string | null | undefined) => (d ? dateFormat.format(new Date(d)) : "—");

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const employeeKeys = {
  all: ["employees"] as const,
  list: ["employees", "list"] as const,
  detail: (id: string) => ["employees", "detail", id] as const,
  leave: (employeeId: string, month: number, year: number) => ["employees", "leave", employeeId, month, year] as const,
  salary: (employeeId: string) => ["employees", "salary", employeeId] as const,
  sales: (employeeId: string, year: number) => ["employees", "sales", employeeId, year] as const,
  access: (employeeId: string) => ["employees", "access", employeeId] as const,
};

// ─── Extra module access (admin only) ──────────────────────────────────────

/** The login behind an employee record, its role's modules and the changes an admin made. */
export type EmployeeAccess = {
  user: { _id: string; full_name: string; gmail: string; role: string } | null;
  roleModules?: string[]; // what the role opens by default (removable; none for admins)
  removedModules?: string[]; // role modules taken away from this user
  extraModules: string[];
  grantable: string[]; // modules this user's role can't open on its own
};

export function useEmployeeAccess(employeeId: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.access(employeeId),
    queryFn: async () => (await api<{ data: EmployeeAccess }>(`employee/${employeeId}/access`)).data,
    enabled: enabled && Boolean(employeeId),
  });
}

/** `modules` = extra modules granted; `removed` = role modules taken away. */
export const saveEmployeeAccess = ({ employeeId, modules, removed }: { employeeId: string; modules: string[]; removed: string[] }) =>
  api<{ data: EmployeeAccess }>(`employee/${employeeId}/access`, { method: "PUT", body: { modules, removed } });

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.list,
    queryFn: async () => {
      const res = await api<{ employees: Employee[] }>("getemployee");
      return [...res.employees].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => (await api<{ employee: Employee }>(`getemployeebyid/${id}`)).employee,
    enabled: Boolean(id),
  });
}

export function useSearchEmployees() {
  return useMutation({
    mutationFn: (keyword: string) => api<{ total: number; data: Employee[] }>("searchemployee", { method: "POST", body: { keyword } }),
  });
}

export function useLeaveMonth(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: employeeKeys.leave(employeeId, month, year),
    queryFn: async () => (await api<{ data: LeaveRecord }>(`leavesinmounth/by-month?employeeId=${employeeId}&month=${month}&year=${year}`)).data,
    enabled: Boolean(employeeId),
  });
}

export function useSalaryHistory(employeeId: string) {
  return useQuery({
    queryKey: employeeKeys.salary(employeeId),
    queryFn: async () => (await api<{ data: SalaryHistory }>(`salary/${employeeId}/history`)).data,
    enabled: Boolean(employeeId),
  });
}

export function useYearlyReport(employeeId: string, year: number) {
  return useQuery({
    queryKey: employeeKeys.sales(employeeId, year),
    queryFn: async () => (await api<{ data: YearlyReport }>(`monthly-report/${employeeId}/${year}`)).data,
    enabled: Boolean(employeeId),
    retry: false,
  });
}

export function useEmployeesMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export type EmployeeInput = {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  joining_date: string;
  company: string;
  current_salary?: number;
  status?: EmployeeStatus;
  account_details?: AccountDetails;
  pan_card?: File | null;
  aadhaar_card?: File | null;
  photo?: File | null;
};

function buildEmployeeBody({ pan_card, aadhaar_card, photo, account_details, ...rest }: EmployeeInput) {
  const hasFile = pan_card || aadhaar_card || photo;
  if (!hasFile) {
    return { body: { ...rest, ...(account_details ? { account_details } : {}) } };
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  if (account_details) fd.append("account_details", JSON.stringify(account_details));
  if (pan_card) fd.append("pan_card", pan_card);
  if (aadhaar_card) fd.append("aadhaar_card", aadhaar_card);
  if (photo) fd.append("photo", photo);
  return { formData: fd };
}

export const saveEmployee = ({ id, ...input }: EmployeeInput & { id?: string }) =>
  id ? api(`updateemployee/${id}`, { method: "PUT", ...buildEmployeeBody(input) }) : api("createemployee", { method: "POST", ...buildEmployeeBody(input) });

export const deleteEmployee = (id: string) => api(`deleteemployee/${id}`, { method: "DELETE" });

// ─── My profile (employee-role users, own record) ──────────────────────────

export const profileKey = ["employees", "my-profile"] as const;

export function useMyProfile(enabled: boolean) {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => (await api<{ data: Employee }>("my-employee-profile")).data,
    enabled,
    retry: false,
  });
}

/** What an employee may change on their own record (pay and status stay admin-only). */
export type ProfileInput = Omit<EmployeeInput, "email" | "current_salary" | "status">;

export const saveMyProfile = (input: ProfileInput) => api<{ data: Employee }>("my-employee-profile", { method: "PUT", ...buildEmployeeBody(input) });

/** Profile fields still missing, so the page can nudge the employee to finish it. */
export function missingProfileFields(e: Employee): string[] {
  const missing: string[] = [];
  if (!e.gender) missing.push("gender");
  if (!e.photo) missing.push("photo");
  if (!e.pan_card) missing.push("PAN card");
  if (!e.aadhaar_card) missing.push("Aadhaar card");
  const bank = e.account_details;
  if (!bank?.account_number && !bank?.upi_id) missing.push("bank details");
  return missing;
}

export type AddLeaveInput = { employeeId: string; month: number; year: number; date: string; leave_type: LeaveType; reason?: string };
export const addLeaveDate = (body: AddLeaveInput) => api("enterleave/leave", { method: "POST", body });

export type GenerateSalaryInput = { employeeId: string; month: number; year: number; increment?: number };
export const generateSalary = (body: GenerateSalaryInput) => api("salary/generate", { method: "POST", body });

export const markSalaryPaid = (salaryId: string) => api(`salary/${salaryId}/paid`, { method: "PATCH" });

export type GiveIncrementInput = { employeeId: string; increment: number };
export const giveIncrement = (body: GiveIncrementInput) => api("update-increment", { method: "PUT", body });

export type UpsertSalesTargetInput = { employee: string; month: number; year: number; target: number; achieved?: number; remarks?: string };
export const upsertSalesTarget = (body: UpsertSalesTargetInput) => api("sales/upsert", { method: "PUT", body });

export type AddAchievedInput = { employee: string; month: number; year: number; achieved: number };
export const addAchieved = (body: AddAchievedInput) => api("add-achieved", { method: "PATCH", body });
