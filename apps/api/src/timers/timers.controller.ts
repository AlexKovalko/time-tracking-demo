import { Body, Controller, Get, Post } from '@nestjs/common';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';
import { TimersService } from './timers.service';

@Controller('timers')
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get('active')
  listActive() {
    return this.timersService.listActive();
  }

  @Post('start')
  start(@Body() dto: StartTimerDto) {
    return this.timersService.start(dto);
  }

  @Post('stop')
  stop(@Body() dto: StopTimerDto) {
    return this.timersService.stop(dto);
  }
}
