import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class StopTimerDto {
  @ValidateIf((o: StopTimerDto) => !o.timerId)
  @IsUUID()
  employeeId?: string;

  @ValidateIf((o: StopTimerDto) => !o.employeeId)
  @IsUUID()
  @IsOptional()
  timerId?: string;
}
