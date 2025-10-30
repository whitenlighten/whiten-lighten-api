# Database Connection Health Monitoring

## Add to app.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Public } from './common/decorator/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'celeb-dent-api'
    };
  }

  @Public()
  @Get('health/database')
  async getDatabaseHealth() {
    const dbHealth = await this.prisma.healthCheck();
    const connectionStats = await this.prisma.getConnectionStats();

    return {
      database: dbHealth,
      connections: connectionStats,
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get('health/detailed')
  async getDetailedHealth() {
    try {
      // Test basic connectivity
      const dbHealth = await this.prisma.healthCheck();
      const connectionStats = await this.prisma.getConnectionStats();

      // Test a simple query
      const patientCount = await this.prisma.patient.count();

      // Check for recent activity
      const recentAppointments = await this.prisma.appointment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return {
        status: 'healthy',
        database: dbHealth,
        connections: connectionStats,
        metrics: {
          totalPatients: patientCount,
          recentAppointments: recentAppointments
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

## Environment Variable Update

Add to your .env file:

```env
# Database connection with optimized pooling
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20&statement_cache_size=100&connect_timeout=30"

# Optional: Enable query logging in development
PRISMA_LOG_LEVEL="info"
```

## Monitoring Script

Create a simple monitoring script to check your connection health:

```bash
#!/bin/bash
# save as monitor-db.sh

echo "Checking database health..."
curl -s http://localhost:3000/health/database | jq '.'

echo -e "\nChecking detailed health..."
curl -s http://localhost:3000/health/detailed | jq '.'

echo -e "\nDone."
```

Make it executable:
```bash
chmod +x monitor-db.sh
```

## Connection Monitoring Query

Run this directly in PostgreSQL to monitor connections:

```sql
-- Check active connections
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE application_name LIKE '%prisma%') as prisma_connections
FROM pg_stat_activity;

-- Check long-running queries
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;
```

This will help you monitor the connection improvements after implementing the fixes.