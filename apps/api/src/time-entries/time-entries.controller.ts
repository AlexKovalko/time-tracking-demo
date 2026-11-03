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
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ListTimeEntriesQueryDto } from './dto/list-time-entries.query';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get()
  findAll(@Query() query: ListTimeEntriesQueryDto) {
    return this.timeEntriesService.findAll({
      from: query.from,
      to: query.to,
      employeeId: query.employeeId,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTimeEntryDto) {
    return this.timeEntriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.timeEntriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string) {
    this.timeEntriesService.remove(id);
    return { ok: true };
  }
}
