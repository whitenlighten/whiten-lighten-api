import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs once every day at midnight
  async handleCron() {
    this.logger.log('Running scheduled task to clean up expired refresh tokens...');

    try {
      const now = new Date();
      const { count } = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: now, // Delete tokens where the expiry date is less than the current time
          },
        },
      });
      this.logger.log(`Successfully deleted ${count} expired refresh tokens.`);
    } catch (error: any) {
      this.logger.error('Failed to clean up expired refresh tokens.', error.stack);
    }
  }
}