"use client";

import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useCategories, useProducts, useWarehouses } from "@/lib/stock";
import { ProductDialog } from "../_components/product-dialog";
import { ProductTable } from "../_components/product-table";
import { EmptyState, QueryState } from "../_components/stock-ui";

export function ProductsView() {
  const products = useProducts();
  const warehouses = useWarehouses();
  const categories = useCategories();
  const [adding, setAdding] = useState(false);

  return (
    <QueryState queries={[products, warehouses, categories]}>
      {() => (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Every product across all warehouses. Click a product to manage it.</p>
            <Button onClick={() => setAdding(true)} disabled={warehouses.data?.length === 0}>
              <Plus className="size-4" aria-hidden />
              Add product
            </Button>
          </div>

          {warehouses.data?.length === 0 ? (
            <EmptyState icon={<Package className="size-6" />} title="Add a warehouse first">
              Products are stored in warehouses. Create one on the Warehouses tab.
            </EmptyState>
          ) : (
            <ProductTable products={products.data!} categories={categories.data!} warehouses={warehouses.data!} />
          )}

          <ProductDialog open={adding} onClose={() => setAdding(false)} />
        </>
      )}
    </QueryState>
  );
}
