import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  clampPage,
  clampPageLimit,
  Paginated,
} from '../common/pagination';
import {
  computeDurationSeconds,
  mapTimeEntry,
  periodBounds,
  TimeEntryDto,
  TimeEntryRow,
} from '../common/time-entry.mapper';
import { DatabaseService } from '../database/database.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

export type ListTimeEntriesParams = {
  from?: string;
  to?: string;
  employeeId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly employees: EmployeesService,
  ) {}

  /**
   * Without page/limit → full array (calendar / legacy).
   * With page and/or limit → `{ items, total, page, limit }`.
   */
  findAll(
    params: ListTimeEntriesParams = {},
  ): TimeEntryDto[] | Paginated<TimeEntryDto> {
    const { whereSql, whereParams } = this.buildWhere(params);
    const paginate = params.page != null || params.limit != null;

    if (!paginate) {
      const rows = this.database.connection
        .prepare(
          `${this.baseSelect()} ${whereSql} ORDER BY te.start DESC`,
        )
        .all(...whereParams) as TimeEntryRow[];
      return rows.map(mapTimeEntry);
    }

    const page = clampPage(params.page);
    const limit = clampPageLimit(params.limit);
    const total = (
      this.database.connection
        .prepare(
          `SELECT COUNT(*) AS c
           FROM time_entries te
           JOIN employees e ON e.id = te.employee_id
           ${whereSql}`,
        )
        .get(...whereParams) as { c: number }
    ).c;

    const offset = (page - 1) * limit;
    const rows = this.database.connection
      .prepare(
        `${this.baseSelect()} ${whereSql}
         ORDER BY te.start DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...whereParams, limit, offset) as TimeEntryRow[];

    return {
      items: rows.map(mapTimeEntry),
      total,
      page,
      limit,
    };
  }

  findOne(id: string): TimeEntryDto {
    const row = this.database.connection
      .prepare(`${this.baseSelect()} WHERE te.id = ?`)
      .get(id) as TimeEntryRow | undefined;
    if (!row) {
      throw new NotFoundException(`Time entry ${id} not found`);
    }
    return mapTimeEntry(row);
  }

  create(dto: CreateTimeEntryDto): TimeEntryDto {
    this.employees.findOne(dto.employeeId);

    const stop = dto.stop === undefined ? null : dto.stop;
    if (stop === null) {
      const running = this.findRunningRaw(dto.employeeId);
      if (running) {
        throw new ConflictException('Employee already has a running timer');
      }
    }

    if (stop != null && Date.parse(stop) < Date.parse(dto.start)) {
      throw new BadRequestException('stop must be after start');
    }

    const id = randomUUID();
    const durationSeconds =
      stop != null ? computeDurationSeconds(dto.start, stop) : null;

    this.database.connection
      .prepare(
        `INSERT INTO time_entries (id, employee_id, description, start, stop, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, dto.employeeId, dto.description, dto.start, stop, durationSeconds);

    return this.findOne(id);
  }

  update(id: string, dto: UpdateTimeEntryDto): TimeEntryDto {
    const current = this.database.connection
      .prepare(
        `SELECT id, employee_id, description, start, stop, duration_seconds
         FROM time_entries WHERE id = ?`,
      )
      .get(id) as TimeEntryRow | undefined;
    if (!current) {
      throw new NotFoundException(`Time entry ${id} not found`);
    }

    const description = dto.description ?? current.description;
    const start = dto.start ?? current.start;
    const stop = dto.stop === undefined ? current.stop : dto.stop;

    if (stop != null && Date.parse(stop) < Date.parse(start)) {
      throw new BadRequestException('stop must be after start');
    }

    if (stop === null) {
      const other = this.findRunningRaw(current.employee_id);
      if (other && other.id !== id) {
        throw new ConflictException('Employee already has a running timer');
      }
    }

    const durationSeconds =
      stop != null ? computeDurationSeconds(start, stop) : null;

    this.database.connection
      .prepare(
        `UPDATE time_entries
         SET description = ?, start = ?, stop = ?, duration_seconds = ?
         WHERE id = ?`,
      )
      .run(description, start, stop, durationSeconds, id);

    return this.findOne(id);
  }

  remove(id: string): void {
    const result = this.database.connection
      .prepare('DELETE FROM time_entries WHERE id = ?')
      .run(id);
    if (result.changes === 0) {
      throw new NotFoundException(`Time entry ${id} not found`);
    }
  }

  private baseSelect(): string {
    return `
      SELECT te.id, te.employee_id, e.name AS employee_name,
             te.description, te.start, te.stop, te.duration_seconds
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
    `;
  }

  private buildWhere(params: ListTimeEntriesParams): {
    whereSql: string;
    whereParams: string[];
  } {
    const clauses: string[] = [];
    const whereParams: string[] = [];

    if (params.from && params.to) {
      const { fromIso, toIso } = periodBounds(params.from, params.to);
      clauses.push('te.start >= ? AND te.start <= ?');
      whereParams.push(fromIso, toIso);
    } else if (params.from || params.to) {
      throw new BadRequestException('Both from and to are required together');
    }

    if (params.employeeId) {
      clauses.push('te.employee_id = ?');
      whereParams.push(params.employeeId);
    }

    if (params.q != null && params.q.trim() !== '') {
      clauses.push('te.description LIKE ? COLLATE NOCASE');
      whereParams.push(`%${params.q.trim()}%`);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return { whereSql, whereParams };
  }

  private findRunningRaw(employeeId: string): TimeEntryRow | undefined {
    return this.database.connection
      .prepare(
        `SELECT id, employee_id, description, start, stop, duration_seconds
         FROM time_entries
         WHERE employee_id = ? AND stop IS NULL
         LIMIT 1`,
      )
      .get(employeeId) as TimeEntryRow | undefined;
  }
}
