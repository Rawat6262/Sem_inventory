"use client";

import { ChevronRight, Mail, Phone, Plus, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button, Select } from "@/components/ui";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { deleteVendor, useVendors, useVendorsMutation, type Vendor } from "@/lib/vendors";
import { VendorDialog } from "./_components/vendor-dialog";

export function VendorsView() {
  const vendors = useVendors();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<Vendor | null | "new">(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const remove = useVendorsMutation((id: string) => deleteVendor(id));

  const categories = useMemo(() => [...new Set((vendors.data ?? []).map((v) => v.category))].sort(), [vendors.data]);

  const q = search.trim().toLowerCase();
  const list = (vendors.data ?? []).filter(
    (v) =>
      (!q || v.vendorName.toLowerCase().includes(q) || v.phoneNo.includes(q) || v.email?.toLowerCase().includes(q)) &&
      (!categoryFilter || v.category === categoryFilter),
  );

  return (
    <QueryState queries={[vendors]}>
      {() => (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, phone or email" />
              {categories.length > 0 && (
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className="sm:w-44">
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add vendor
            </Button>
          </div>

          {vendors.data?.length === 0 ? (
            <EmptyState icon={<Store className="size-6" />} title="No vendors yet" action={<Button onClick={() => setEditing("new")}>Add the first vendor</Button>}>
              Add a vendor to start buying from and paying them.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No vendors match these filters.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Category</th>
                    <th className={th}>Contact</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((v) => (
                    <tr key={v._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/vendor/${v._id}`} className="font-medium hover:text-accent hover:underline">
                          {v.vendorName}
                        </Link>
                      </td>
                      <td className={`${td} text-muted`}>{v.category}</td>
                      <td className={td}>
                        <div className="flex flex-col gap-0.5 text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden />
                            {v.phoneNo}
                          </span>
                          {v.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="size-3.5" aria-hidden />
                              {v.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/modules/vendor/${v._id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            View
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                          <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(v)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(v)} aria-label={`Delete ${v.vendorName}`}>
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          <VendorDialog open={editing !== null} vendor={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.vendorName ?? ""}?`}
            confirmLabel="Delete vendor"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            Any products pointing at this vendor will just show no vendor. This can&apos;t be undone.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
