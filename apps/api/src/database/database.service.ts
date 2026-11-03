import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: Database.Database;

  get connection(): Database.Database {
    return this.db;
  }

  onModuleInit(): void {
    const dbPath = resolveSqlitePath();
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.registerUnicodeLower();
    this.migrate();
  }

  /** SQLite COLLATE NOCASE / lower() are ASCII-only; JS handles Cyrillic. */
  private registerUnicodeLower(): void {
    this.db.function('unicode_lower', { deterministic: true }, (value: unknown) =>
      String(value ?? '').toLocaleLowerCase('en-US'),
    );
  }

  onModuleDestroy(): void {
    this.db?.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY NOT NULL,
        employee_id TEXT NOT NULL,
        description TEXT NOT NULL,
        start TEXT NOT NULL,
        stop TEXT,
        duration_seconds INTEGER,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_time_entries_employee
        ON time_entries(employee_id);

      CREATE INDEX IF NOT EXISTS idx_time_entries_start
        ON time_entries(start);
    `);

    this.ensureColumn('employees', 'department_id', 'department_id TEXT');
    this.ensureColumn('employees', 'title', 'title TEXT');
    this.ensureColumn('employees', 'email', 'email TEXT');
    this.ensureColumn('employees', 'phone', 'phone TEXT');

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_employees_department
        ON employees(department_id);
    `);
  }

  private ensureColumn(
    table: string,
    column: string,
    addColumnSql: string,
  ): void {
    const cols = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${addColumnSql}`);
    }
  }
}

function resolveSqlitePath(): string {
  const configured = process.env.SQLITE_PATH?.trim();
  if (configured) {
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }
  return join(process.cwd(), 'data', 'time-tracking-demo.sqlite');
}
