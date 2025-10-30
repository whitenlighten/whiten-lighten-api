# EMERGENCY DATABASE OPTIMIZATION PLAN

## CRITICAL ISSUES IDENTIFIED FROM MONITORING

Based on the dashboard monitoring data, your system is showing severe database performance problems:

### 🚨 CONNECTION CRISIS (IMMEDIATE ATTENTION REQUIRED)
- **Peak connections**: 1,800+ (Monday spike)
- **Hitting connection limits**: Orange MAX line indicates pool exhaustion
- **Root cause**: No connection pooling + connection leaks

### 📊 MONITORING DATA ANALYSIS

#### Connection Patterns
- Massive spikes indicate connection leaks or pool exhaustion
- Connections not being properly released
- Application likely creating new connections for each request

#### Database Activity
- **Sunday**: 2.5K row operations
- **Wednesday**: 5K row operations
- **Pattern**: Bulk operations causing compute spikes

#### Cache Performance
- **Hit rate**: 0-35% (should be 80%+)
- **Working set**: Consistently 24.58 kB (should vary)
- **File cache**: 3.18 GB (indicates inefficient queries)

## IMMEDIATE FIXES (DO THESE TODAY)

### 1. Fix Connection Pooling (CRITICAL)
Update your DATABASE_URL immediately:

```env
# Current (causing problems)
DATABASE_URL="postgresql://user:password@host:port/db"

# Fixed (with connection limits)
DATABASE_URL="postgresql://user:password@host:port/db?connection_limit=10&pool_timeout=20&statement_cache_size=100&connect_timeout=30"
```

### 2. Update Prisma Service for Connection Management

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Add connection monitoring
    this.$on('query', (e) => {
      if (e.duration > 1000) { // Log slow queries
        console.warn(`Slow Query (${e.duration}ms):`, e.query);
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
      return { status: 'error', error: error.message };
    }
  }
}
```

### 3. Add Database Indexes (Copy from OPTIMIZED_SCHEMA_INDEXES.md)

Run this immediately:
```bash
npx prisma migrate dev --name "emergency_performance_indexes"
```

### 4. Monitor Connection Usage

Add this endpoint to monitor connections:

```typescript
// Add to app.controller.ts
import { PrismaService } from 'prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health/database')
  async getDatabaseHealth() {
    const health = await this.prisma.healthCheck();

    // Get connection info
    const connections = await this.prisma.$queryRaw`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `;

    return {
      database: health,
      connections,
      timestamp: new Date().toISOString()
    };
  }
}
```

## CONNECTION LEAK DETECTION

Your connection spikes suggest these problems in your code:

### Problem 1: Transaction Overuse
```typescript
// BAD - Creates unnecessary connections
const [total, data] = await this.prisma.$transaction([
  this.prisma.patient.count({ where }),
  this.prisma.patient.findMany({ where })
]);

// GOOD - Single query
const data = await this.prisma.patient.findMany({
  where,
  // Use cursor pagination instead
});
```

### Problem 2: Missing Connection Release
Check for any manual Prisma client creation that's not being properly closed.

### Problem 3: Concurrent Operations
The spikes suggest many operations happening simultaneously without proper queuing.

## EXPECTED RESULTS AFTER FIXES

### Connection Count
- **Before**: 1,800+ peak connections
- **After**: <50 connections max

### Cache Hit Rate
- **Before**: 0-35%
- **After**: 70-90%

### Compute Hours
- **Before**: 521.55 hours
- **After**: 80-120 hours (70%+ reduction)

## MONITORING COMMANDS

After implementing fixes, monitor with:

```bash
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
psql -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check cache hit rate
psql -c "SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_rate FROM pg_statio_user_tables;"
```

## TIMELINE

- **Hour 1**: Update DATABASE_URL with connection limits
- **Hour 2**: Deploy Prisma service updates
- **Hour 3**: Add critical indexes
- **Hour 4**: Deploy monitoring endpoint
- **Day 1**: Monitor improvements
- **Week 1**: Full optimization implementation

The monitoring data clearly shows you're in a database crisis. These fixes should immediately reduce your connection issues and start bringing down compute costs.