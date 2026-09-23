import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Connection, ConnectionStates } from 'mongoose';
import { NoStore } from '../common/http/cache-control';

@ApiTags('health')
@SkipThrottle()
@Controller('api/health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @NoStore()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  @ApiOkResponse({ schema: { example: { status: 'ok', db: 'up' } } })
  @ApiServiceUnavailableResponse({
    description: 'The database is not connected.',
  })
  health(): { status: string; db: string } {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up' };
  }
}
