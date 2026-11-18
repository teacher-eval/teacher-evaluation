/**
 * Status pill, ported from getStatusBadge() in the PHP helpers.
 *
 * `users.status` is a free-form varchar, so anything unknown degrades to a
 * neutral badge with underscores turned into spaces.
 */
export function statusBadge(status: string): { label: string; className: string } {
  const key = status.trim().toLowerCase();

  switch (key) {
    case "active":
      return { label: "Active", className: "badge badge-success" };
    case "pending_2fa":
      return { label: "Pending 2FA", className: "badge badge-warning" };
    case "inactive":
      return { label: "Inactive", className: "badge badge-danger" };
    default: {
      const label = key
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return { label: label || "Unknown", className: "badge badge-neutral" };
    }
  }
}
