import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health (DB, memory)' })
  @ApiResponse({
    status: 200,
    description: 'All checks passed — application is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more checks failed — application is unhealthy',
    schema: {
      example: {
        status: 'error',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {
          database: { status: 'down', message: 'Connection refused' },
        },
        details: {
          memory_heap: { status: 'up' },
          database: { status: 'down', message: 'Connection refused' },
        },
      },
    },
  })
  check(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          return {
            database: { status: 'down', message: (error as Error).message },
          };
        }
      },
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ];

    return this.health.check(checks);
  }
}