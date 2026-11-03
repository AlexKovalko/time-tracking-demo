import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly employees: EmployeesService,
  ) {}

  findAll(from?: string, to?: string): TimeEntryDto[] {
    let sql = `
      SELECT te.id, te.employee_id, e.name AS employee_name,
             te.description, te.start, te.stop, te.duration_seconds
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
    `;
    const params: string[] = [];

    if (from && to) {
      const { fromIso, toIso } = periodBounds(from, to);
      sql += ` WHERE te.start >= ? AND te.start <= ?`;
      params.push(fromIso, toIso);
    } else if (from || to) {
      throw new BadRequestException('Both from and to are required together');
    }

    sql += ` ORDER BY te.start DESC`;

    const rows = this.database.connection.prepare(sql).all(...params) as TimeEntryRow[];
    return rows.map(mapTimeEntry);
  }

  findOne(id: string): TimeEntryDto {
    const row = this.database.connection
      .prepare(
        `SELECT te.id, te.employee_id, e.name AS employee_name,
                te.description, te.start, te.stop, te.duration_seconds
         FROM time_entries te
         JOIN employees e ON e.id = te.employee_id
         WHERE te.id = ?`,
      )
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
        throw new ConflictException(
          'Employee already has a running timer',
        );
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
    const stop =
      dto.stop === undefined ? current.stop : dto.stop;

    if (stop != null && Date.parse(stop) < Date.parse(start)) {
      throw new BadRequestException('stop must be after start');
    }

    // Becoming or staying running must not create a second running timer
    if (stop === null) {
      const other = this.findRunningRaw(current.employee_id);
      if (other && other.id !== id) {
        throw new ConflictException(
          'Employee already has a running timer',
        );
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
