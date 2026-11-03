import { Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportPeriodQueryDto {
  @Matches(DATE_RE)
  from!: string;

  @Matches(DATE_RE)
  to!: string;
}
