import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeStatsQueryDto } from './dto/employee-stats.query';
import { ListEmployeesQueryDto } from './dto/list-employees.query';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query() query: ListEmployeesQueryDto) {
    return this.employeesService.findPage(query.page, query.limit);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string, @Query() query: EmployeeStatsQueryDto) {
    return this.employeesService.stats(id, query.from, query.to);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string) {
    this.employeesService.remove(id);
    return { ok: true };
  }
}
