import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { ReportsModule } from './reports/reports.module';
import { SeedModule } from './seed/seed.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TimersModule } from './timers/timers.module';

@Module({
  imports: [
    DatabaseModule,
    SeedModule,
    EmployeesModule,
    TimersModule,
    TimeEntriesModule,
    ReportsModule,
  ],
})
export class AppModule {}
