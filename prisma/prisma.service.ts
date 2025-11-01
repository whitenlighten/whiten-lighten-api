import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }); 
  } 

  async onModuleInit() {
    await this.$connect();

    // Add connection monitoring (only if log level 'query' is enabled in constructor)
    this.$on('query' as never, (e: Prisma.QueryEvent) => { // Cast to 'never' to bypass type checking
      if (e.duration > 1000) {
        console.warn(`Slow Query (${e.duration}ms):`, e.query); // Log slow queries
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Add connection health check
  async healthCheck() {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'error', error: error.message };
      }
      return { status: 'error', error: 'An unknown error occurred' };
    }
  }
}
