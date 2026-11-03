import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { periodBounds } from '../common/time-entry.mapper';
import {
  clampPage,
  clampPageLimit,
  Paginated,
} from '../common/pagination';
import { DatabaseService } from '../database/database.service';
import { DepartmentsService } from '../departments/departments.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export type EmployeeDepartment = { id: string; name: string };

export type Employee = {
  id: string;
  name: string;
  departmentId: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  department?: EmployeeDepartment | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  department_id: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  department_name: string | null;
};

export type EmployeeStats = {
  totalDurationSeconds: number;
  entryCount: number;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly departments: DepartmentsService,
  ) {}

  findAll(): Employee[] {
    return this.queryEmployees();
  }

  findPage(page?: number, limit?: number): Paginated<Employee> {
    const p = clampPage(page);
    const l = clampPageLimit(limit);
    const total = (
      this.database.connection
        .prepare('SELECT COUNT(*) AS c FROM employees')
        .get() as { c: number }
    ).c;
    const offset = (p - 1) * l;
    const items = this.queryEmployees(l, offset);
    return { items, total, page: p, limit: l };
  }

  findOne(id: string): Employee {
    const row = this.database.connection
      .prepare(
        `SELECT e.id, e.name, e.department_id, e.title, e.email, e.phone,
                d.name AS department_name
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.id = ?`,
      )
      .get(id) as EmployeeRow | undefined;
    if (!row) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return mapEmployee(row);
  }

  stats(id: string, from: string, to: string): EmployeeStats {
    this.findOne(id);
    const { fromIso, toIso } = periodBounds(from, to);
    const row = this.database.connection
      .prepare(
        `SELECT
           COUNT(*) AS entry_count,
           COALESCE(SUM(CASE WHEN stop IS NOT NULL THEN duration_seconds ELSE 0 END), 0)
             AS total_duration_seconds
         FROM time_entries
         WHERE employee_id = ?
           AND start >= ?
           AND start <= ?`,
      )
      .get(id, fromIso, toIso) as {
      entry_count: number;
      total_duration_seconds: number;
    };
    return {
      totalDurationSeconds: row.total_duration_seconds,
      entryCount: row.entry_count,
    };
  }

  create(dto: CreateEmployeeDto): Employee {
    const departmentId = this.resolveDepartmentId(dto.departmentId);
    const employeeId = randomUUID();
    this.database.connection
      .prepare(
        `INSERT INTO employees (id, name, department_id, title, email, phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        employeeId,
        dto.name,
        departmentId,
        dto.title ?? null,
        dto.email ?? null,
        dto.phone ?? null,
      );
    return this.findOne(employeeId);
  }

  update(id: string, dto: UpdateEmployeeDto): Employee {
    const current = this.findOne(id);
    const name = dto.name ?? current.name;
    if (!name.trim()) {
      throw new BadRequestException('name must not be empty');
    }

    const departmentId =
      dto.departmentId === undefined
        ? current.departmentId
        : this.resolveDepartmentId(dto.departmentId);

    const title = dto.title === undefined ? current.title : dto.title;
    const email = dto.email === undefined ? current.email : dto.email;
    const phone = dto.phone === undefined ? current.phone : dto.phone;

    this.database.connection
      .prepare(
        `UPDATE employees
         SET name = ?, department_id = ?, title = ?, email = ?, phone = ?
         WHERE id = ?`,
      )
      .run(name, departmentId, title, email, phone, id);

    return this.findOne(id);
  }

  remove(id: string): void {
    this.findOne(id);
    this.database.connection
      .prepare('DELETE FROM employees WHERE id = ?')
      .run(id);
  }

  private resolveDepartmentId(
    departmentId: string | null | undefined,
  ): string | null {
    if (departmentId == null) return null;
    this.departments.findOne(departmentId);
    return departmentId;
  }

  private queryEmployees(limit?: number, offset?: number): Employee[] {
    let sql = `
      SELECT e.id, e.name, e.department_id, e.title, e.email, e.phone,
             d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY e.name COLLATE NOCASE ASC
    `;
    const params: number[] = [];
    if (limit != null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset ?? 0);
    }
    const rows = this.database.connection
      .prepare(sql)
      .all(...params) as EmployeeRow[];
    return rows.map(mapEmployee);
  }
}

function mapEmployee(row: EmployeeRow): Employee {
  const department =
    row.department_id && row.department_name
      ? { id: row.department_id, name: row.department_name }
      : null;
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    title: row.title,
    email: row.email,
    phone: row.phone,
    department,
  };
}
