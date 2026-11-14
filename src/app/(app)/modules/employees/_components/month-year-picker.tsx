"use client";

import { Select } from "@/components/ui";
import { MONTH_NAMES } from "@/lib/employees";

type Props = { month: number; year: number; onChange: (month: number, year: number) => void; yearsBack?: number };

export function MonthYearPicker({ month, year, onChange, yearsBack = 3 }: Props) {
  const now = new Date();
  const years = Array.from({ length: yearsBack + 2 }, (_, i) => now.getFullYear() + 1 - yearsBack + i);

  return (
    <div className="flex gap-2">
      <Select aria-label="Month" value={month} onChange={(e) => onChange(Number(e.target.value), year)} className="w-36">
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select aria-label="Year" value={year} onChange={(e) => onChange(month, Number(e.target.value))} className="w-24">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
