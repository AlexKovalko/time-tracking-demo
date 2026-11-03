import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportChartsQueryDto {
  @Matches(DATE_RE)
  from!: string;

  @Matches(DATE_RE)
  to!: string;

  @IsOptional()
  @IsIn(['day', 'week'])
  bucket?: 'day' | 'week';

  @IsOptional()
  @IsIn(['employees', 'departments'])
  breakdown?: 'employees' | 'departments';

  /** When set — employee-scoped profile charts (AC-33…36). `q` is ignored. */
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
