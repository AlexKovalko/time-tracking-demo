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
    this.migrate();
  }

  onModuleDestroy(): void {
    this.db?.close();
  }

  private migrate(): void {
    this.db.exec(`
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
  }
}

function resolveSqlitePath(): string {
  const configured = process.env.SQLITE_PATH?.trim();
  if (configured) {
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }
  return join(process.cwd(), 'data', 'falconai.sqlite');
}
