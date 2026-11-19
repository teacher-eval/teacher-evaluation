import { APP_TIMEZONE } from "@/lib/env";

/**
 * Date helpers.
 *
 * Postgres DATE columns come back from Prisma as Date objects pinned to
 * midnight UTC. Formatting them with a Manila timezone would shift them a day
 * backwards, so date-only values are always rendered in UTC.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-02-21" for a DATE column, without timezone drift. */
export function isoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Formats a DATE column the way formatDate() did: "February 21, 2026". */
export function formatDate(value: Date): string {
  return DATE_FORMAT.format(value);
}

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats a DATE column like PHP's date('M d, Y'): "February 21" → "Feb 21". */
export function formatShortDate(value: Date): string {
  return SHORT_DATE_FORMAT.format(value);
}

const TODAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: APP_TIMEZONE,
});

/** Today's date in the app timezone, like PHP's date('F d, Y'). */
export function formatToday(now: Date = new Date()): string {
  return TODAY_FORMAT.format(now);
}

/** Today in the configured timezone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from today until a DATE value. Negative if already past. */
export function daysFromToday(value: Date, now: Date = new Date()): number {
  const today = Date.parse(`${todayIso(now)}T00:00:00Z`);
  const target = Date.parse(`${isoDateOnly(value)}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

/**
 * Human-readable semester from the stored `evaluation_settings.semester`
 * values ("1st" | "2nd" | "Summer"): "1st Semester", "Summer".
 */
export function semesterLabel(semester: string): string {
  const value = semester.trim();
  return value === "Summer" ? "Summer" : `${value} Semester`;
}
