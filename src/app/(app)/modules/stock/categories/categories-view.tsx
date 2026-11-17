"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { canDeleteOwned } from "@/lib/permissions";
import {
  categoryName,
  deleteCategory,
  fmt,
  saveCategory,
  useCategories,
  useProducts,
  useStockMutation,
  type Category,
} from "@/lib/stock";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "../_components/stock-ui";

export function CategoriesView() {
  const categories = useCategories();
  const products = useProducts();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | null | "new">(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const remove = useStockMutation((id: string) => deleteCategory(id));
  const me = useMe().data;

  // How many products use each category (matched by id or by name).
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products.data ?? []) {
      const name = categoryName(p.category, categories.data);
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return map;
  }, [products.data, categories.data]);

  const q = search.trim().toLowerCase();
  const list = (categories.data ?? []).filter((c) => !q || c.category.toLowerCase().includes(q));
  const deletingCount = deleting ? (usage.get(deleting.category) ?? 0) : 0;

  return (
    <QueryState queries={[categories, products]}>
      {() => (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search categories" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add category
            </Button>
          </div>

          {categories.data?.length === 0 ? (
            <EmptyState icon={<Tags className="size-6" />} title="No categories yet" action={<Button onClick={() => setEditing("new")}>Add a category</Button>}>
              Categories group products, for example Furniture, Lighting or Carpets.
            </EmptyState>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Category</th>
                    <th className={`${th} text-right`}>Products</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((c) => (
                    <tr key={c._id}>
                      <td className={`${td} font-medium`}>{c.category}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(usage.get(c.category) ?? 0)}</td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(c)} aria-label={`Rename ${c.category}`}>
                            <Pencil className="size-3.5" aria-hidden />
                            <span className="hidden sm:inline">Rename</span>
                          </Button>
                          {me && canDeleteOwned(me, c.createdBy) && (
                            <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.category}`}>
                              <Trash2 className="size-3.5" aria-hidden />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">No categories match &ldquo;{search}&rdquo;.</p>}
            </TableWrap>
          )}

          <CategoryDialog category={editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.category ?? ""}?`}
            confirmLabel="Delete category"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            {deletingCount > 0 ? (
              <>
                <strong className="text-ink">{fmt(deletingCount)} products</strong> use this category. They&apos;ll keep working but will show an unknown
                category until you edit them. This can&apos;t be undone.
              </>
            ) : (
              <>No products use this category. This can&apos;t be undone.</>
            )}
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}

function CategoryDialog({ category, onClose }: { category: Category | null | "new"; onClose: () => void }) {
  const existing = category && category !== "new" ? category : null;
  return (
    <Modal open={category !== null} onClose={onClose} title={existing ? "Rename category" : "Add category"}>
      {category !== null && <CategoryForm key={existing?._id ?? "new"} existing={existing} onDone={onClose} />}
    </Modal>
  );
}

function CategoryForm({ existing, onDone }: { existing: Category | null; onDone: () => void }) {
  const [name, setName] = useState(existing?.category ?? "");
  const save = useStockMutation(saveCategory);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ id: existing?._id, category: name.trim() }, { onSuccess: onDone });
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Name">{(id) => <Input id={id} required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Furniture" />}</Field>
      {save.error && <Alert>{/E11000/.test(save.error.message) ? "A category with this name already exists." : save.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
          {existing ? "Save" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
