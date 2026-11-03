export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

/** Default page size 20; allow 1–50 (soft clamp). */
export function clampPageLimit(limit?: number): number {
  if (limit == null || Number.isNaN(Number(limit))) return 20;
  const n = Math.floor(Number(limit));
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, n));
}

export function clampPage(page?: number): number {
  if (page == null || Number.isNaN(Number(page))) return 1;
  const n = Math.floor(Number(page));
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}
