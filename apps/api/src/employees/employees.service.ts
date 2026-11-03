import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export type Employee = { id: string; name: string };

@Injectable()
export class EmployeesService {
  constructor(private readonly database: DatabaseService) {}

  findAll(): Employee[] {
    return this.database.connection
      .prepare('SELECT id, name FROM employees ORDER BY name COLLATE NOCASE ASC')
      .all() as Employee[];
  }

  findOne(id: string): Employee {
    const row = this.database.connection
      .prepare('SELECT id, name FROM employees WHERE id = ?')
      .get(id) as Employee | undefined;
    if (!row) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return row;
  }

  create(dto: CreateEmployeeDto): Employee {
    const employee: Employee = { id: randomUUID(), name: dto.name };
    this.database.connection
      .prepare('INSERT INTO employees (id, name) VALUES (?, ?)')
      .run(employee.id, employee.name);
    return employee;
  }

  update(id: string, dto: UpdateEmployeeDto): Employee {
    this.findOne(id);
    this.database.connection
      .prepare('UPDATE employees SET name = ? WHERE id = ?')
      .run(dto.name, id);
    return { id, name: dto.name };
  }

  remove(id: string): void {
    this.findOne(id);
    // Cascade delete of time_entries via FK ON DELETE CASCADE
    this.database.connection
      .prepare('DELETE FROM employees WHERE id = ?')
      .run(id);
  }
}
