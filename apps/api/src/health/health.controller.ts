import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: process is up. Never touches dependencies, so a DB blip does not restart the pod.
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  // Readiness: can serve traffic. Redis joins this check when BullMQ lands in Phase 2.
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Not ready');
    }
    return { status: 'ok' };
  }
}
