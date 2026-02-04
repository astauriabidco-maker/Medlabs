/**
 * Health Module - Production health check endpoints
 * Used by load balancers and monitoring systems
 */
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [TerminusModule, PrismaModule],
    controllers: [HealthController],
    providers: [PrismaHealthIndicator],
})
export class HealthModule { }
