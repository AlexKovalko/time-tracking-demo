import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportChartsQueryDto } from './dto/report-charts.query';
import { ReportPeriodQueryDto } from './dto/report-period.query';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@Query() query: ReportPeriodQueryDto) {
    return this.reportsService.summary(query.from, query.to);
  }

  @Get('charts')
  charts(@Query() query: ReportChartsQueryDto) {
    return this.reportsService.charts(
      query.from,
      query.to,
      query.bucket ?? 'day',
      query.breakdown ?? 'employees',
    );
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  export(
    @Query() query: ReportPeriodQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): string {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="time-report-${query.from}_${query.to}.csv"`,
    );
    return this.reportsService.exportCsv(query.from, query.to);
  }
}
