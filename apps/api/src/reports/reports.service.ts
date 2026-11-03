import { Injectable } from '@nestjs/common';
import { formatDuration } from '../common/format-duration';
import {
  mapTimeEntry,
  periodBounds,
  TimeEntryDto,
  TimeEntryRow,
} from '../common/time-entry.mapper';
import { DatabaseService } from '../database/database.service';

export type ReportSummary = {
  employees: Array<{
    employeeId: string;
    name: string;
    totalDurationSeconds: number;
  }>;
  grandTotalSeconds: number;
};

export type ChartBucketRow = {
  key: string;
  label: string;
  totalDurationSeconds: number;
};

export type ReportCharts = {
  overTime: ChartBucketRow[];
  breakdown: ChartBucketRow[];
};

/** Employee profile charts (AC-33…36): overTime + description breakdown. */
export type EmployeeCharts = {
  overTime: ChartBucketRow[];
  descriptionBreakdown: ChartBucketRow[];
};

const DESCRIPTION_TOP_N = 8;
const UNTITLED_KEY = 'untitled';
const UNTITLED_LABEL = 'Untitled';
const OTHER_KEY = 'other';
const OTHER_LABEL = 'Other';

type ClosedEntryAgg = {
  employeeId: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  description: string;
  start: string;
  durationSeconds: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService) {}

  summary(from: string, to: string): ReportSummary {
    const entries = this.entriesInPeriod(from, to).filter(
      (e) => e.stop != null && e.durationSeconds != null,
    );

    const byEmployee = new Map<
      string,
      { employeeId: string; name: string; totalDurationSeconds: number }
    >();

    for (const entry of entries) {
      const name = entry.employeeName ?? entry.employeeId;
      const current = byEmployee.get(entry.employeeId) ?? {
        employeeId: entry.employeeId,
        name,
        totalDurationSeconds: 0,
      };
      current.totalDurationSeconds += entry.durationSeconds ?? 0;
      byEmployee.set(entry.employeeId, current);
    }

    const employees = [...byEmployee.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const grandTotalSeconds = employees.reduce(
      (sum, row) => sum + row.totalDurationSeconds,
      0,
    );

    return { employees, grandTotalSeconds };
  }

  charts(
    from: string,
    to: string,
    bucket: 'day' | 'week' = 'day',
    breakdown: 'employees' | 'departments' = 'employees',
    employeeId?: string,
  ): ReportCharts | EmployeeCharts {
    const closed = this.closedEntriesForCharts(from, to, employeeId);

    if (employeeId) {
      return {
        overTime: this.buildOverTime(closed, from, to, bucket),
        descriptionBreakdown: this.buildDescriptionBreakdown(closed),
      };
    }

    return {
      overTime: this.buildOverTime(closed, from, to, bucket),
      breakdown: this.buildBreakdown(closed, breakdown),
    };
  }

  exportCsv(from: string, to: string): string {
    const entries = this.entriesInPeriod(from, to);
    const header = 'employee,description,start,stop,durationSeconds,duration';
    const lines = entries.map((e) =>
      [
        csvEscape(e.employeeName ?? e.employeeId),
        csvEscape(e.description),
        csvEscape(e.start),
        csvEscape(e.stop ?? ''),
        e.durationSeconds ?? '',
        e.durationSeconds != null
          ? csvEscape(formatDuration(e.durationSeconds, 'ru'))
          : '',
      ].join(','),
    );
    return [header, ...lines].join('\n') + '\n';
  }

  private entriesInPeriod(from: string, to: string): TimeEntryDto[] {
    const { fromIso, toIso } = periodBounds(from, to);
    const rows = this.database.connection
      .prepare(
        `SELECT te.id, te.employee_id, e.name AS employee_name,
                te.description, te.start, te.stop, te.duration_seconds
         FROM time_entries te
         JOIN employees e ON e.id = te.employee_id
         WHERE te.start >= ? AND te.start <= ?
         ORDER BY te.start ASC`,
      )
      .all(fromIso, toIso) as TimeEntryRow[];
    return rows.map(mapTimeEntry);
  }

  private closedEntriesForCharts(
    from: string,
    to: string,
    employeeId?: string,
  ): ClosedEntryAgg[] {
    const { fromIso, toIso } = periodBounds(from, to);
    const params: string[] = [fromIso, toIso];
    let employeeClause = '';
    if (employeeId) {
      employeeClause = ' AND te.employee_id = ?';
      params.push(employeeId);
    }

    const rows = this.database.connection
      .prepare(
        `SELECT te.employee_id AS employee_id,
                e.name AS employee_name,
                e.department_id AS department_id,
                d.name AS department_name,
                te.description AS description,
                te.start AS start,
                te.duration_seconds AS duration_seconds
         FROM time_entries te
         JOIN employees e ON e.id = te.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE te.start >= ? AND te.start <= ?
           AND te.stop IS NOT NULL
           AND te.duration_seconds IS NOT NULL${employeeClause}`,
      )
      .all(...params) as Array<{
      employee_id: string;
      employee_name: string;
      department_id: string | null;
      department_name: string | null;
      description: string;
      start: string;
      duration_seconds: number;
    }>;

    return rows.map((r) => ({
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      departmentId: r.department_id,
      departmentName: r.department_name,
      description: r.description ?? '',
      start: r.start,
      durationSeconds: r.duration_seconds,
    }));
  }

  private buildOverTime(
    entries: ClosedEntryAgg[],
    from: string,
    to: string,
    bucket: 'day' | 'week',
  ): ChartBucketRow[] {
    const totals = new Map<string, number>();

    for (const entry of entries) {
      const key =
        bucket === 'day'
          ? entry.start.slice(0, 10)
          : isoWeekKey(entry.start.slice(0, 10));
      totals.set(key, (totals.get(key) ?? 0) + entry.durationSeconds);
    }

    // Emit only keys that appear (or empty list for empty window).
    // For non-empty seed windows, include all days/weeks in range so charts have shape.
    if (entries.length === 0) {
      return [];
    }

    const keys = bucket === 'day' ? eachDay(from, to) : eachWeek(from, to);

    return keys.map((key) => ({
      key,
      label: key,
      totalDurationSeconds: totals.get(key) ?? 0,
    }));
  }

  private buildBreakdown(
    entries: ClosedEntryAgg[],
    breakdown: 'employees' | 'departments',
  ): ChartBucketRow[] {
    if (entries.length === 0) {
      return [];
    }

    const totals = new Map<string, { label: string; total: number }>();

    for (const entry of entries) {
      if (breakdown === 'employees') {
        const current = totals.get(entry.employeeId) ?? {
          label: entry.employeeName,
          total: 0,
        };
        current.total += entry.durationSeconds;
        totals.set(entry.employeeId, current);
      } else {
        const key = entry.departmentId ?? 'unassigned';
        const label = entry.departmentName ?? 'Unassigned';
        const current = totals.get(key) ?? { label, total: 0 };
        current.total += entry.durationSeconds;
        totals.set(key, current);
      }
    }

    return [...totals.entries()]
      .map(([key, v]) => ({
        key,
        label: v.label,
        totalDurationSeconds: v.total,
      }))
      .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);
  }

  /** Top-N descriptions + Other; empty description → Untitled (AC-34). */
  private buildDescriptionBreakdown(
    entries: ClosedEntryAgg[],
  ): ChartBucketRow[] {
    if (entries.length === 0) {
      return [];
    }

    const totals = new Map<string, { label: string; total: number }>();

    for (const entry of entries) {
      const trimmed = entry.description.trim();
      const key = trimmed === '' ? UNTITLED_KEY : trimmed;
      const label = trimmed === '' ? UNTITLED_LABEL : trimmed;
      const current = totals.get(key) ?? { label, total: 0 };
      current.total += entry.durationSeconds;
      totals.set(key, current);
    }

    const sorted = [...totals.entries()]
      .map(([key, v]) => ({
        key,
        label: v.label,
        totalDurationSeconds: v.total,
      }))
      .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

    if (sorted.length <= DESCRIPTION_TOP_N) {
      return sorted;
    }

    const top = sorted.slice(0, DESCRIPTION_TOP_N);
    const otherSeconds = sorted
      .slice(DESCRIPTION_TOP_N)
      .reduce((sum, row) => sum + row.totalDurationSeconds, 0);

    if (otherSeconds > 0) {
      top.push({
        key: OTHER_KEY,
        label: OTHER_LABEL,
        totalDurationSeconds: otherSeconds,
      });
    }

    return top;
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Monday-based ISO week key: YYYY-Www */
function isoWeekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  // Thursday of this week determines ISO week-year
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  const year = d.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function eachWeek(from: string, to: string): string[] {
  const days = eachDay(from, to);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of days) {
    const key = isoWeekKey(day);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
