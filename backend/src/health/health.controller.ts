/**
 * Health Controller - Endpoints for load balancer and monitoring
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private prisma: PrismaHealthIndicator,
    ) { }

    /**
     * Basic liveness probe - just checks if the app is running
     */
    @Get()
    @ApiOperation({ summary: 'Basic health check' })
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
        };
    }

    /**
     * Detailed readiness probe - checks dependencies
     */
    @Get('ready')
    @HealthCheck()
    @ApiOperation({ summary: 'Readiness check with dependencies' })
    checkReady() {
        return this.health.check([
            // Database connectivity
            () => this.prisma.isHealthy('database'),

            // Memory usage (< 512MB heap)
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

            // Disk usage (< 90% usage)
            () => this.disk.checkStorage('disk', {
                path: '/',
                thresholdPercent: 0.9,
            }),
        ]);
    }

    /**
     * Liveness probe for Kubernetes
     */
    @Get('live')
    @ApiOperation({ summary: 'Liveness probe' })
    checkLive() {
        return {
            status: 'ok',
            uptime: process.uptime(),
        };
    }
}
