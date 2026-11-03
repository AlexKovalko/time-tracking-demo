import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import { computeDurationSeconds } from '../common/time-entry.mapper';
import { DatabaseService } from '../database/database.service';

/**
 * Seeds fictional employees + closed entries when the DB is empty (AC-3).
 * Set SEED_ON_BOOT=false to skip. Run again via `pnpm --filter api seed`.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    if (process.env.SEED_ON_BOOT === 'false') {
      return;
    }
    this.seedIfEmpty();
  }

  seedIfEmpty(force = false): { employees: number; entries: number } {
    const count = (
      this.database.connection
        .prepare('SELECT COUNT(*) AS c FROM employees')
        .get() as { c: number }
    ).c;

    if (count > 0 && !force) {
      this.logger.log('Seed skipped — employees already present');
      return { employees: 0, entries: 0 };
    }

    if (force) {
      this.database.connection.exec('DELETE FROM time_entries; DELETE FROM employees;');
    }

    return this.insertDemoData();
  }

  private insertDemoData(): { employees: number; entries: number } {
    const insertEmployee = this.database.connection.prepare(
      'INSERT INTO employees (id, name) VALUES (?, ?)',
    );
    const insertEntry = this.database.connection.prepare(
      `INSERT INTO time_entries (id, employee_id, description, start, stop, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const employeeCount = 5;
    const employeeIds: string[] = [];

    const tx = this.database.connection.transaction(() => {
      for (let i = 0; i < employeeCount; i += 1) {
        const id = randomUUID();
        insertEmployee.run(id, faker.person.fullName());
        employeeIds.push(id);
      }

      let entries = 0;
      for (const employeeId of employeeIds) {
        const n = faker.number.int({ min: 1, max: 3 });
        for (let i = 0; i < n; i += 1) {
          const startDate = faker.date.recent({ days: 14 });
          const durationSec = faker.number.int({ min: 600, max: 14_400 });
          const stopDate = new Date(startDate.getTime() + durationSec * 1000);
          const start = startDate.toISOString();
          const stop = stopDate.toISOString();
          insertEntry.run(
            randomUUID(),
            employeeId,
            faker.company.catchPhrase(),
            start,
            stop,
            computeDurationSeconds(start, stop),
          );
          entries += 1;
        }
      }
      return entries;
    });

    const entries = tx();
    this.logger.log(
      `Seeded ${employeeCount} employees and ${entries} closed time entries (faker)`,
    );
    return { employees: employeeCount, entries };
  }
}
