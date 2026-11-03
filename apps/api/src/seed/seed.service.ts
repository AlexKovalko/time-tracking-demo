import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { faker } from '@faker-js/faker/locale/ru';
import { randomUUID } from 'node:crypto';
import { computeDurationSeconds } from '../common/time-entry.mapper';
import { DatabaseService } from '../database/database.service';

const DEPARTMENT_NAMES = [
  'Разработка',
  'Продажи',
  'Поддержка',
  'Маркетинг',
] as const;

const EMPLOYEE_PROFILES: Array<{
  name: string;
  title: string;
  email: string;
  phone: string;
}> = [
  {
    name: 'Анна Иванова',
    title: 'Senior Frontend',
    email: 'anna.ivanova@example.com',
    phone: '+7 900 111-22-33',
  },
  {
    name: 'Борис Смирнов',
    title: 'Backend Engineer',
    email: 'boris.smirnov@example.com',
    phone: '+7 900 222-33-44',
  },
  {
    name: 'Виктория Кузнецова',
    title: 'Product Manager',
    email: 'viktoria.kuznetsova@example.com',
    phone: '+7 900 333-44-55',
  },
  {
    name: 'Дмитрий Попов',
    title: 'QA Engineer',
    email: 'dmitry.popov@example.com',
    phone: '+7 900 444-55-66',
  },
  {
    name: 'Елена Соколова',
    title: 'Sales Lead',
    email: 'elena.sokolova@example.com',
    phone: '+7 900 555-66-77',
  },
  {
    name: 'Игорь Лебедев',
    title: 'Support Specialist',
    email: 'igor.lebedev@example.com',
    phone: '+7 900 666-77-88',
  },
  {
    name: 'Мария Козлова',
    title: 'Marketing Manager',
    email: 'maria.kozlova@example.com',
    phone: '+7 900 777-88-99',
  },
  {
    name: 'Николай Новиков',
    title: 'DevOps Engineer',
    email: 'nikolay.novikov@example.com',
    phone: '+7 900 888-99-00',
  },
  {
    name: 'Ольга Морозова',
    title: 'Designer',
    email: 'olga.morozova@example.com',
    phone: '+7 900 101-20-30',
  },
  {
    name: 'Павел Волков',
    title: 'Account Executive',
    email: 'pavel.volkov@example.com',
    phone: '+7 900 202-30-40',
  },
];

const WORK_DESCRIPTIONS = [
  'Стендап и планирование спринта',
  'Ревью pull request',
  'Исправление бага в API',
  'Встреча с заказчиком',
  'Написание автотестов',
  'Подготовка демо',
  'Документация API',
  'Онбординг нового сотрудника',
  'Анализ метрик отчёта',
  'Рефакторинг модуля таймеров',
];

/**
 * Seeds departments, employees (ru FIO + profile), and dense closed entries.
 * Set SEED_ON_BOOT=false to skip. Force: `pnpm --filter api seed -- --force`
 * or SEED_FORCE=true on boot.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    if (process.env.SEED_ON_BOOT === 'false') {
      return;
    }
    const force =
      process.env.SEED_FORCE === 'true' || process.env.SEED_FORCE === '1';
    this.seedIfEmpty(force);
  }

  seedIfEmpty(force = false): {
    departments: number;
    employees: number;
    entries: number;
  } {
    const count = (
      this.database.connection
        .prepare('SELECT COUNT(*) AS c FROM employees')
        .get() as { c: number }
    ).c;

    if (count > 0 && !force) {
      this.logger.log('Seed skipped — employees already present');
      return { departments: 0, employees: 0, entries: 0 };
    }

    if (force) {
      this.database.connection.exec(`
        DELETE FROM time_entries;
        DELETE FROM employees;
        DELETE FROM departments;
      `);
    }

    return this.insertDemoData();
  }

  private insertDemoData(): {
    departments: number;
    employees: number;
    entries: number;
  } {
    const insertDept = this.database.connection.prepare(
      'INSERT INTO departments (id, name) VALUES (?, ?)',
    );
    const insertEmployee = this.database.connection.prepare(
      `INSERT INTO employees (id, name, department_id, title, email, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertEntry = this.database.connection.prepare(
      `INSERT INTO time_entries (id, employee_id, description, start, stop, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const result = this.database.connection.transaction(() => {
      const departmentIds: string[] = [];
      for (const name of DEPARTMENT_NAMES) {
        const id = randomUUID();
        insertDept.run(id, name);
        departmentIds.push(id);
      }

      const employeeIds: string[] = [];
      EMPLOYEE_PROFILES.forEach((profile, index) => {
        const id = randomUUID();
        const departmentId = departmentIds[index % departmentIds.length];
        // Majority get title + contact; leave last without phone for optional demo
        const phone = index < EMPLOYEE_PROFILES.length - 1 ? profile.phone : null;
        insertEmployee.run(
          id,
          profile.name,
          departmentId,
          profile.title,
          profile.email,
          phone,
        );
        employeeIds.push(id);
      });

      let entries = 0;
      const now = Date.now();
      const dayMs = 86_400_000;

      employeeIds.forEach((employeeId, empIndex) => {
        // Dense: ~10–14 closed entries per employee across last 28 days
        const n = 10 + (empIndex % 5);
        for (let i = 0; i < n; i += 1) {
          const daysAgo = faker.number.int({ min: 0, max: 27 });
          const hour = faker.number.int({ min: 8, max: 17 });
          const minute = faker.number.int({ min: 0, max: 59 });
          const startDate = new Date(now - daysAgo * dayMs);
          startDate.setUTCHours(hour, minute, 0, 0);
          const durationSec = faker.number.int({ min: 900, max: 14_400 });
          const stopDate = new Date(startDate.getTime() + durationSec * 1000);
          const start = startDate.toISOString();
          const stop = stopDate.toISOString();
          insertEntry.run(
            randomUUID(),
            employeeId,
            WORK_DESCRIPTIONS[i % WORK_DESCRIPTIONS.length],
            start,
            stop,
            computeDurationSeconds(start, stop),
          );
          entries += 1;
        }
      });

      return {
        departments: departmentIds.length,
        employees: employeeIds.length,
        entries,
      };
    })();

    this.logger.log(
      `Seeded ${result.departments} departments, ${result.employees} employees, ${result.entries} closed time entries`,
    );
    return result;
  }
}
