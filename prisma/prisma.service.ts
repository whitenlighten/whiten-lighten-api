/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect(); // Connects Prisma to the DB
  }

  async enableShutdownHooks(app: INestApplication) {
      this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }
}
