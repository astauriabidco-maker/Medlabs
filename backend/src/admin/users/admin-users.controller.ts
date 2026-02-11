
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../../auth/guards';
import { PrismaService } from '../../prisma.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';

@ApiTags('Users Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService
    ) { }

    @Get()
    async findAll(@Query('search') search?: string, @Query('role') role?: string) {
        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { tenant: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (role) {
            where.role = role;
        }

        return this.prisma.user.findMany({
            where: {
                ...where,
                deletedAt: null
            },
            include: {
                tenant: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    @Post()
    async create(@Body() dto: CreateAdminUserDto, @Request() req: any) {
        // Validation
        const existing = await this.prisma.user.findFirst({
            where: {
                email: dto.email,
                deletedAt: null
            }
        });
        if (existing) throw new BadRequestException('Email already exists');

        if (dto.role !== 'SUPER_ADMIN' && !dto.tenantId) {
            throw new BadRequestException('Tenant ID is required for non-Super Admins');
        }

        const password = dto.password || Math.random().toString(36).slice(-8);
        const hash = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role,
                tenantId: dto.tenantId,
                passwordHash: hash,
                status: UserStatus.ACTIVE
            }
        });

        // Audit log
        await this.auditService.logUserAction(
            'USER_CREATED',
            dto.email,
            req.user?.id,
            dto.tenantId,
            user.id
        );

        return user;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto, @Request() req: any) {
        const data: any = { ...dto };

        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 10);
            delete data.password;
        }

        const user = await this.prisma.user.update({
            where: { id },
            data
        });

        // Audit log
        await this.auditService.logUserAction(
            'USER_UPDATED',
            user.email,
            req.user?.id,
            user.tenantId || undefined,
            user.id
        );

        return user;
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: UserStatus.SUSPENDED }
        });

        // Audit log
        await this.auditService.logUserAction(
            'USER_DELETED',
            user.email,
            req.user?.id,
            user.tenantId || undefined,
            user.id
        );

        return user;
    }
}
