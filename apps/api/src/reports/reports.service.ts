import { Injectable } from '@nestjs/common';
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

  exportCsv(from: string, to: string): string {
    const entries = this.entriesInPeriod(from, to);
    const header = 'employee,description,start,stop,durationSeconds';
    const lines = entries.map((e) =>
      [
        csvEscape(e.employeeName ?? e.employeeId),
        csvEscape(e.description),
        csvEscape(e.start),
        csvEscape(e.stop ?? ''),
        e.durationSeconds ?? '',
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
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
