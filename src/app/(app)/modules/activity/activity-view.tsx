"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { Button, Field, Input, Select, cn } from "@/components/ui";
import { EmptyState, QueryState, TableWrap, td, th } from "@/components/data-ui";
import { ACTIONS, fmtDateTime, MODULES, useActivityLog, type ActivityAction, type ActivityLog } from "@/lib/activity";

const ACTION_TONE: Record<ActivityAction, string> = {
  CREATE: "text-success",
  UPDATE: "text-accent",
  DELETE: "text-danger",
  LOGIN: "text-muted",
  LOGOUT: "text-muted",
};

export function ActivityView() {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  const limit = 25;
  const activity = useActivityLog({
    page,
    limit,
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
    search: search.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const hasFilters = Boolean(moduleFilter || actionFilter || search || startDate || endDate);
  function clearFilters() {
    setModuleFilter("");
    setActionFilter("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <QueryState queries={[activity]}>
      {() => {
        const d = activity.data!;
        return (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <Field label="Search">
                {(id) => (
                  <Input
                    id={id}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="User name or description"
                    className="w-56"
                  />
                )}
              </Field>
              <Field label="Module">
                {(id) => (
                  <Select
                    id={id}
                    value={moduleFilter}
                    onChange={(e) => {
                      setModuleFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  >
                    <option value="">All modules</option>
                    {MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Action">
                {(id) => (
                  <Select
                    id={id}
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value as ActivityAction | "");
                      setPage(1);
                    }}
                    className="w-32"
                  >
                    <option value="">Any action</option>
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="From">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                )}
              </Field>
              <Field label="To">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                )}
              </Field>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {d.data.length === 0 ? (
              <EmptyState icon={<History className="size-6" />} title="No activity found">
                {hasFilters ? "No entries match these filters." : "Nothing has been logged yet."}
              </EmptyState>
            ) : (
              <>
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>When</th>
                        <th className={th}>Who</th>
                        <th className={th}>Action</th>
                        <th className={th}>Module</th>
                        <th className={th}>What happened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {d.data.map((log) => (
                        <tr key={log._id} className="cursor-pointer hover:bg-surface-2/40" onClick={() => setSelected(log)}>
                          <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(log.createdAt)}</td>
                          <td className={td}>{log.userName || "Unknown"}</td>
                          <td className={`${td} font-medium ${ACTION_TONE[log.action]}`}>{log.action}</td>
                          <td className={`${td} text-muted`}>{log.module}</td>
                          <td className={`${td} max-w-md truncate`}>{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>

                <Pagination page={d.pagination.page} total={d.pagination.totalPages} onPage={setPage} />
                <p className="mt-2 text-center text-xs text-muted">{d.pagination.total} entries</p>
              </>
            )}

            <ActivityDetailModal log={selected} onClose={() => setSelected(null)} />
          </>
        );
      }}
    </QueryState>
  );
}

function ActivityDetailModal({ log, onClose }: { log: ActivityLog | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(log)} onClose={onClose} title={log ? `${log.action} · ${log.module}` : ""} description={log ? fmtDateTime(log.createdAt) : undefined}>
      {log && (
        <div className="flex flex-col gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted">Who</p>
            <p>
              {log.userName}
              {log.user?.gmail ? <span className="text-muted"> · {log.user.gmail}</span> : null}
              {log.user?.role ? <span className="text-muted"> · {log.user.role}</span> : null}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">What happened</p>
            <p>{log.description}</p>
          </div>
          {log.oldData != null && (
            <div>
              <p className="text-xs font-medium text-muted">Before</p>
              <pre className={cn("mt-1 max-h-48 overflow-auto rounded-lg border border-line bg-surface-2/50 p-2.5 text-xs")}>
                {JSON.stringify(log.oldData, null, 2)}
              </pre>
            </div>
          )}
          {log.newData != null && (
            <div>
              <p className="text-xs font-medium text-muted">After</p>
              <pre className={cn("mt-1 max-h-48 overflow-auto rounded-lg border border-line bg-surface-2/50 p-2.5 text-xs")}>
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
