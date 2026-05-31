import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    (this as any).$on('error', (e: Prisma.LogEvent) => this.logger.error(e.message));
    (this as any).$on('warn', (e: Prisma.LogEvent) => this.logger.warn(e.message));

    await this.$connect();
    this.logger.log('🥃 PrismaService conectado');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: { close: () => Promise<void> }) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
