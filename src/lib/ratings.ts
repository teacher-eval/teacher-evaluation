/**
 * Qualitative bands for a 1–5 average, ported from the `$ratingBand` closure in
 * frontend/views/teacher/dashboard.php.
 *
 * `badge` and `bar` are class fragments rather than full class names so the
 * caller can decide whether to append sizing utilities. `hex` mirrors the
 * Chart.js palette, where index 0 is "Very Poor".
 */
export type RatingBand = {
  label: string;
  badge: string;
  bar: string;
  hex: string;
};

export function ratingBand(avg: number | null): RatingBand {
  if (avg === null) {
    return {
      label: "No data",
      badge: "badge-neutral",
      bar: "bg-slate-300",
      hex: "#cbd5e1",
    };
  }
  if (avg >= 4.5) {
    return {
      label: "Excellence",
      badge: "badge-success",
      bar: "bg-success-600",
      hex: "#15803D",
    };
  }
  if (avg >= 3.5) {
    return {
      label: "Good",
      badge: "badge-info",
      bar: "bg-info-600",
      hex: "#1D4ED8",
    };
  }
  if (avg >= 2.5) {
    return {
      label: "Fair",
      badge: "badge-warning",
      bar: "bg-warning-600",
      hex: "#B45309",
    };
  }
  if (avg >= 1.5) {
    return {
      label: "Poor",
      badge: "badge-caution",
      bar: "bg-caution-500",
      hex: "#F97316",
    };
  }
  return {
    label: "Very Poor",
    badge: "badge-danger",
    bar: "bg-danger-600",
    hex: "#B91C1C",
  };
}

/** `number_format($value, 2)` — "4.50", with thousands separators on the left. */
export function formatAverage(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `number_format($value)` — "1,234". */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export type FeelsBadge = { label: string; className: string };

/**
 * Badge for a raw `reactions.feels` value, from the $ratingBadges map in
 * frontend/views/admin/dashboard.php. The column is a Postgres enum, but raw
 * queries hand it back as a plain string, hence the defensive lookup.
 */
export function feelsBadge(feels: string): FeelsBadge {
  switch (feels.trim().toLowerCase()) {
    case "outstanding":
      return { label: "Outstanding", className: "badge-success" };
    case "very satisfactory":
      return { label: "Very Satisfactory", className: "badge-info" };
    case "satisfactory":
      return { label: "Satisfactory", className: "badge-warning" };
    case "needs improvements":
      return { label: "Needs Improvement", className: "badge-caution" };
    case "poor":
      return { label: "Poor", className: "badge-danger" };
    default:
      return {
        label: feels
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        className: "badge-neutral",
      };
  }
}
