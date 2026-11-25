import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() health() { return { status: 'ok', service: 'product-os-api' }; }
  @Get('ready') async readiness() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ready', database: 'connected' }; }
    catch { throw new ServiceUnavailableException({ status: 'not_ready', database: 'unavailable' }); }
  }
}
