import { CalendarIcon } from "@/components/icons";
import { formatToday } from "@/lib/dates";

/**
 * The "today" pill shown on every dashboard header, matching the legacy
 * date('F d, Y') chip.
 */
export function DateChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-card">
      <CalendarIcon className="h-4 w-4 text-navy" />
      {formatToday()}
    </span>
  );
}
