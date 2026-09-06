import { startOfDay, endOfDay, subDays } from "date-fns";

export interface DateRange {
  start: Date;
  end: Date;
}

export type PeriodKey = "today" | "7d" | "30d" | "90d";
export type PeriodInput = PeriodKey | { from: Date; to: Date };

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
];

/**
 * Resolves a period selection into the current window and the immediately
 * preceding window of the same length — the "previous period" every
 * analytics card compares against.
 */
export function resolvePeriod(period: PeriodInput): { current: DateRange; previous: DateRange } {
  const now = new Date();
  let current: DateRange;

  if (typeof period === "object") {
    current = { start: startOfDay(period.from), end: endOfDay(period.to) };
  } else {
    const days = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    current = { start: startOfDay(subDays(now, days - 1)), end: endOfDay(now) };
  }

  const lengthMs = current.end.getTime() - current.start.getTime() + 1;
  const previous: DateRange = {
    start: new Date(current.start.getTime() - lengthMs),
    end: new Date(current.start.getTime() - 1),
  };

  return { current, previous };
}
