"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/reports";

// Money in vs money out for each month of one year: grouped bars on one ₹ axis.
// Colours come from the --chart-in / --chart-out tokens (validated for
// colour-blind separation and contrast in light and dark). Hover or focus a
// month for the exact figures; the month-by-month table below is the table view.

export type ChartMonth = { label: string; moneyIn: number; moneyOut: number };

const W = 720;
const H = 240;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };

/** ₹1.2Cr, ₹4.5L, ₹12k, ₹800 */
export function shortRupees(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const trim = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, ""));
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3)}k`;
  return `${sign}₹${Math.round(a)}`;
}

/** Gridline steps of 1, 2 or 5 × 10ⁿ (₹1L, ₹2L, ₹5L ...) so axis labels stay round. */
function niceTicks(v: number, target = 4) {
  if (v <= 0) return [0, 1];
  const raw = v / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  const top = Math.ceil(v / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** A bar with 4px rounded top corners, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function MoneyChart({ months }: { months: ChartMonth[] }) {
  const [active, setActive] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...months.map((m) => Math.max(m.moneyIn, m.moneyOut)), 0));
  const max = ticks[ticks.length - 1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / months.length;
  const barW = Math.min(18, (slot - 10) / 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const a = active != null ? months[active] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-in" /> Money in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-out" /> Money out
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Money in and money out for each month. The table below lists the same figures.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                {shortRupees(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const x0 = PAD.left + i * slot + (slot - (barW * 2 + 2)) / 2;
            const dim = active != null && active !== i;
            return (
              <g
                key={m.label}
                tabIndex={0}
                role="button"
                aria-label={`${m.label}: money in ${fmtMoney(m.moneyIn)}, money out ${fmtMoney(m.moneyOut)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* Hit target: the whole month column, bigger than the bars. */}
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} className={active === i ? "fill-surface-2" : "fill-transparent"} />
                <path d={barPath(x0, y(m.moneyIn), barW, y(0) - y(m.moneyIn))} className="fill-chart-in" opacity={dim ? 0.45 : 1} />
                <path d={barPath(x0 + barW + 2, y(m.moneyOut), barW, y(0) - y(m.moneyOut))} className="fill-chart-out" opacity={dim ? 0.45 : 1} />
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {m.label}
                </text>
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-muted" strokeWidth={1} />
        </svg>
        {a && active != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-48 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md"
            style={{ left: `clamp(0px, calc(${((PAD.left + active * slot + slot / 2) / W) * 100}% - 96px), calc(100% - 192px))` }}
          >
            <p className="font-medium text-ink">{a.label}</p>
            <p className="mt-1 flex justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-sm bg-chart-in" /> Money in
              </span>
              <span className="tabular-nums text-ink">{fmtMoney(a.moneyIn)}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-sm bg-chart-out" /> Money out
              </span>
              <span className="tabular-nums text-ink">{fmtMoney(a.moneyOut)}</span>
            </p>
            <p className="mt-1 flex justify-between gap-2 border-t border-line pt-1">
              <span className="text-muted">Profit</span>
              <span className="tabular-nums font-medium text-ink">{fmtMoney(a.moneyIn - a.moneyOut)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
