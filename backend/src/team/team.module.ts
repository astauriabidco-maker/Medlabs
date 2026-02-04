import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { RoleLimitsService } from './role-limits.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [TeamController],
    providers: [TeamService, RoleLimitsService, PrismaService],
    exports: [TeamService, RoleLimitsService],
})
export class TeamModule { }
