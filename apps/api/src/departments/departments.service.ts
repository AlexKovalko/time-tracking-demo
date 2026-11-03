import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

export type Department = { id: string; name: string };

@Injectable()
export class DepartmentsService {
  constructor(private readonly database: DatabaseService) {}

  findAll(): Department[] {
    return this.database.connection
      .prepare(
        'SELECT id, name FROM departments ORDER BY name COLLATE NOCASE ASC',
      )
      .all() as Department[];
  }

  findOne(id: string): Department {
    const row = this.database.connection
      .prepare('SELECT id, name FROM departments WHERE id = ?')
      .get(id) as Department | undefined;
    if (!row) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return row;
  }

  create(dto: CreateDepartmentDto): Department {
    const department: Department = { id: randomUUID(), name: dto.name };
    try {
      this.database.connection
        .prepare('INSERT INTO departments (id, name) VALUES (?, ?)')
        .run(department.id, department.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE')) {
        throw new ConflictException('Department name already exists');
      }
      throw err;
    }
    return department;
  }

  update(id: string, dto: UpdateDepartmentDto): Department {
    this.findOne(id);
    try {
      this.database.connection
        .prepare('UPDATE departments SET name = ? WHERE id = ?')
        .run(dto.name, id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE')) {
        throw new ConflictException('Department name already exists');
      }
      throw err;
    }
    return { id, name: dto.name };
  }

  /**
   * Delete only when no employees reference the department.
   * Assigned employees must be unassigned (or deleted) first.
   */
  remove(id: string): void {
    this.findOne(id);
    const assigned = (
      this.database.connection
        .prepare(
          'SELECT COUNT(*) AS c FROM employees WHERE department_id = ?',
        )
        .get(id) as { c: number }
    ).c;
    if (assigned > 0) {
      throw new ConflictException(
        'Cannot delete department while employees are assigned; unassign first',
      );
    }
    this.database.connection
      .prepare('DELETE FROM departments WHERE id = ?')
      .run(id);
  }
}
