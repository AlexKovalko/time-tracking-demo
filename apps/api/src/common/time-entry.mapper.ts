export type TimeEntryRow = {
  id: string;
  employee_id: string;
  employee_name?: string | null;
  description: string;
  start: string;
  stop: string | null;
  duration_seconds: number | null;
};

export type TimeEntryDto = {
  id: string;
  employeeId: string;
  employeeName?: string;
  description: string;
  start: string;
  stop: string | null;
  durationSeconds: number | null;
};

export function mapTimeEntry(row: TimeEntryRow): TimeEntryDto {
  return {
    id: row.id,
    employeeId: row.employee_id,
    ...(row.employee_name != null ? { employeeName: row.employee_name } : {}),
    description: row.description,
    start: row.start,
    stop: row.stop,
    durationSeconds: row.duration_seconds,
  };
}

export function computeDurationSeconds(
  startIso: string,
  stopIso: string,
): number {
  const startMs = Date.parse(startIso);
  const stopMs = Date.parse(stopIso);
  if (Number.isNaN(startMs) || Number.isNaN(stopMs)) {
    throw new Error('Invalid ISO datetime');
  }
  return Math.max(0, Math.floor((stopMs - startMs) / 1000));
}

/** Inclusive YYYY-MM-DD bounds → ISO range covering the whole days (UTC calendar dates). */
export function periodBounds(
  from: string,
  to: string,
): { fromIso: string; toIso: string } {
  return {
    fromIso: `${from}T00:00:00.000Z`,
    toIso: `${to}T23:59:59.999Z`,
  };
}
