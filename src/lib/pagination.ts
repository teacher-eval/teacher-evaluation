/**
 * Page-number window with ellipses, ported from getPaginationRange() in the
 * PHP helpers.
 *
 * Example: paginationRange(5, 10) → [1, "...", 3, 4, 5, 6, 7, "...", 10]
 */
export type PaginationItem = number | "...";

export function paginationRange(
  currentPage: number,
  totalPages: number,
  delta = 2,
): PaginationItem[] {
  if (totalPages <= 1) return [1];

  const left = currentPage - delta;
  const right = currentPage + delta + 1;

  const pages: number[] = [];
  for (let page = 1; page <= totalPages; page += 1) {
    if (page === 1 || page === totalPages || (page >= left && page < right)) {
      pages.push(page);
    }
  }

  const output: PaginationItem[] = [];
  let previous: number | null = null;

  for (const page of pages) {
    if (previous !== null) {
      if (page - previous === 2) {
        output.push(previous + 1);
      } else if (page - previous !== 1) {
        output.push("...");
      }
    }
    output.push(page);
    previous = page;
  }

  return output;
}
