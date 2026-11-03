import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  computeDurationSeconds,
  mapTimeEntry,
  TimeEntryDto,
  TimeEntryRow,
} from '../common/time-entry.mapper';
import { DatabaseService } from '../database/database.service';
import { EmployeesService } from '../employees/employees.service';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';

export type ActiveTimer = {
  id: string;
  employeeId: string;
  description: string;
  start: string;
};

@Injectable()
export class TimersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly employees: EmployeesService,
  ) {}

  listActive(): ActiveTimer[] {
    const rows = this.database.connection
      .prepare(
        `SELECT id, employee_id, description, start
         FROM time_entries
         WHERE stop IS NULL
         ORDER BY start ASC`,
      )
      .all() as Array<{
      id: string;
      employee_id: string;
      description: string;
      start: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      description: row.description,
      start: row.start,
    }));
  }

  findRunningForEmployee(employeeId: string): TimeEntryRow | undefined {
    return this.database.connection
      .prepare(
        `SELECT id, employee_id, description, start, stop, duration_seconds
         FROM time_entries
         WHERE employee_id = ? AND stop IS NULL
         LIMIT 1`,
      )
      .get(employeeId) as TimeEntryRow | undefined;
  }

  start(dto: StartTimerDto): TimeEntryDto {
    this.employees.findOne(dto.employeeId);

    const existing = this.findRunningForEmployee(dto.employeeId);
    if (existing) {
      throw new ConflictException('Employee already has a running timer');
    }

    const id = randomUUID();
    const start = new Date().toISOString();
    this.database.connection
      .prepare(
        `INSERT INTO time_entries (id, employee_id, description, start, stop, duration_seconds)
         VALUES (?, ?, ?, ?, NULL, NULL)`,
      )
      .run(id, dto.employeeId, dto.description, start);

    return {
      id,
      employeeId: dto.employeeId,
      description: dto.description,
      start,
      stop: null,
      durationSeconds: null,
    };
  }

  stop(dto: StopTimerDto): TimeEntryDto {
    let row: TimeEntryRow | undefined;

    if (dto.timerId) {
      row = this.database.connection
        .prepare(
          `SELECT id, employee_id, description, start, stop, duration_seconds
           FROM time_entries WHERE id = ?`,
        )
        .get(dto.timerId) as TimeEntryRow | undefined;
      if (!row) {
        throw new NotFoundException(`Timer ${dto.timerId} not found`);
      }
      if (row.stop != null) {
        throw new NotFoundException(`Timer ${dto.timerId} is not running`);
      }
    } else if (dto.employeeId) {
      this.employees.findOne(dto.employeeId);
      row = this.findRunningForEmployee(dto.employeeId);
      if (!row) {
        throw new NotFoundException(
          `No running timer for employee ${dto.employeeId}`,
        );
      }
    } else {
      throw new NotFoundException('employeeId or timerId is required');
    }

    const stop = new Date().toISOString();
    const durationSeconds = computeDurationSeconds(row.start, stop);
    this.database.connection
      .prepare(
        `UPDATE time_entries
         SET stop = ?, duration_seconds = ?
         WHERE id = ?`,
      )
      .run(stop, durationSeconds, row.id);

    return mapTimeEntry({
      ...row,
      stop,
      duration_seconds: durationSeconds,
    });
  }
}
