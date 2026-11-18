import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  ChartColumn,
  Contact,
  FileText,
  Handshake,
  HardHat,
  History,
  Landmark,
  Store,
  Tent,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";

// Same rules as the Flutter app's role_permissions.dart: every module is
// allowed except the ones listed for the role. This only decides what the UI
// shows. The backend must enforce the same rules (phase (b)).

export type Role = "admin" | "employee" | "account" | "supervisor" | "labour";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  employee: "Employee",
  account: "Account",
  supervisor: "Supervisor",
  labour: "Labour",
};

export type ModuleKey =
  | "stock"
  | "exhibitions"
  | "client"
  | "contractor"
  | "supervisor"
  | "manpower"
  | "vendor"
  | "finance-vendor"
  | "transport"
  | "transaction"
  | "outgoing"
  | "incoming"
  | "quotation"
  | "employees"
  | "reports"
  | "activity";

export type ModuleGroup =
  "Operations" | "Partners" | "Money" | "Documents" | "People" | "Admin";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  description: string;
  icon: LucideIcon;
  group: ModuleGroup;
};

export const MODULES: ModuleDef[] = [
  {
    key: "stock",
    label: "Stock",
    description: "Warehouses, products, categories and stock transfers",
    icon: Boxes,
    group: "Operations",
  },
  {
    key: "exhibitions",
    label: "Exhibitions",
    description: "Exhibitions, stalls, designs and linked clients",
    icon: Tent,
    group: "Operations",
  },
  {
    key: "client",
    label: "Clients",
    description: "Client details, stall deals and payment tracking",
    icon: Handshake,
    group: "Operations",
  },
  {
    key: "contractor",
    label: "Contractors",
    description: "Labour contractors, stalls, deal amounts and work payments",
    icon: HardHat,
    group: "Operations",
  },
  {
    key: "supervisor",
    label: "Supervisors",
    description: "Supervisors, their exhibitions and transactions",
    icon: UserCheck,
    group: "Operations",
  },
  {
    key: "manpower",
    label: "Manpower",
    description: "Sub-labour workers",
    icon: Users,
    group: "Operations",
  },
  {
    key: "vendor",
    label: "Vendors",
    description: "Vendor list and details",
    icon: Store,
    group: "Partners",
  },
  {
    key: "finance-vendor",
    label: "Finance vendors",
    description: "Vendor ledger and payments",
    icon: Landmark,
    group: "Partners",
  },
  {
    key: "transport",
    label: "Transport",
    description: "Transporters, transport letters, trips and payments",
    icon: Truck,
    group: "Partners",
  },
  {
    key: "transaction",
    label: "Transactions",
    description: "Payments to labour, supervisors, vendors and transporters",
    icon: ArrowLeftRight,
    group: "Money",
  },
  {
    key: "outgoing",
    label: "Outgoing challans",
    description: "Delivery challans for goods going to an exhibition",
    icon: ArrowUpFromLine,
    group: "Documents",
  },
  {
    key: "incoming",
    label: "Incoming challans",
    description: "Delivery challans for goods coming back",
    icon: ArrowDownToLine,
    group: "Documents",
  },
  {
    key: "quotation",
    label: "Quotations",
    description: "Create quotations and export them as PDF",
    icon: FileText,
    group: "Documents",
  },
  {
    key: "employees",
    label: "Employees",
    description: "Employees, leave, sales targets and increments",
    icon: Contact,
    group: "People",
  },
  {
    key: "reports",
    label: "Reports",
    description:
      "Summaries for projects, exhibitions, warehouses, clients and more",
    icon: ChartColumn,
    group: "Admin",
  },
  {
    key: "activity",
    label: "Activity",
    description: "Audit log of who did what",
    icon: History,
    group: "Admin",
  },
];

const DENIED: Record<Role, ModuleKey[]> = {
  admin: [],
  // Employees work in stock, exhibitions (edit/delete their own), their own
  // clients and their own quotations only.
  employee: [
    "contractor",
    "supervisor",
    "manpower",
    "vendor",
    "finance-vendor",
    "transport",
    "transaction",
    "outgoing",
    "incoming",
    "employees",
    "reports",
    "activity",
  ],
  account: ["reports", "activity"],
  supervisor: [
    "client",
    "employees",
    "quotation",
    "finance-vendor",
    "reports",
    "activity",
  ],
  labour: [
    "exhibitions",
    "client",
    "employees",
    "quotation",
    "finance-vendor",
    "reports",
    "activity",
  ],
};

export function isRole(value: string): value is Role {
  return value in DENIED;
}

/**
 * Modules an admin can grant a user on top of their role (same list as the
 * backend). Inside a granted module the user only works with their own records.
 */
export const GRANTABLE_MODULES: ModuleKey[] = [
  "transaction", "contractor", "manpower", "vendor", "transport", "outgoing", "incoming", "client", "quotation",
];

/** `extra` is the user's admin-granted modules (Me.extraModules). */
export function canOpen(role: string, module: ModuleKey, extra?: readonly string[]): boolean {
  // Unknown roles (for example an old "transporter" account) see nothing.
  if (!isRole(role)) return false;
  return !DENIED[role].includes(module) || isGrantedModule(role, module, extra);
}

/** True when the user can open the module only because an admin granted it. */
export function isGrantedModule(role: string, module: ModuleKey, extra?: readonly string[]): boolean {
  return isRole(role) && DENIED[role].includes(module) && GRANTABLE_MODULES.includes(module) && Boolean(extra?.includes(module));
}

/** Supervisors only read exhibitions; they can't add, edit or delete them. */
export function canManageExhibitions(role: string): boolean {
  return role !== "supervisor";
}

/** Employees only see and manage the clients and quotations they created. */
export function ownsRecordsOnly(role: string): boolean {
  return role === "employee";
}

/** Admin can delete any stock record; everyone else only the ones they added. */
export function canDeleteOwned(
  me: { _id: string; role: string },
  createdBy: string | { _id: string } | null | undefined,
): boolean {
  if (me.role === "admin") return true;
  const owner =
    createdBy && typeof createdBy === "object" ? createdBy._id : createdBy;
  return Boolean(owner) && owner === me._id;
}

/**
 * Employees see all stock and exhibitions but only edit the warehouses,
 * products and exhibitions they added. Supervisors get the same stock rule
 * (exhibitions they can't edit at all: canManageExhibitions).
 */
export function canEditStock(
  me: { _id: string; role: string },
  createdBy: string | { _id: string } | null | undefined,
): boolean {
  if (me.role !== "employee" && me.role !== "supervisor") return true;
  return canDeleteOwned(me, createdBy);
}

export const canEditOwnRecord = canEditStock;

export function modulesFor(role: string, extra?: readonly string[]): ModuleDef[] {
  return MODULES.filter((m) => canOpen(role, m.key, extra));
}

export function findModule(key: string): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key);
}

// Roles a person may pick at sign-up. Admin is assigned by an existing admin;
// labour accounts are no longer self-registered.
export const SIGNUP_ROLES: Role[] = ["employee", "account", "supervisor"];

/** Staff roles with an employee record and a "My profile" page. */
export const PROFILE_ROLES: Role[] = ["employee", "account", "supervisor"];

export function hasProfile(role: string): boolean {
  return (PROFILE_ROLES as string[]).includes(role);
}

/**
 * Account and employee users may only delete records they added themselves.
 * Other roles are left to the backend's own rules.
 */
export function mayDelete(
  me: { _id: string; role: string },
  createdBy: string | { _id: string } | null | undefined,
): boolean {
  if (me.role !== "account" && me.role !== "employee") return true;
  return canDeleteOwned(me, createdBy);
}
