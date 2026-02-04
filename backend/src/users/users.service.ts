
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';

// All platform + tenant roles
export type UserRole =
    | 'SUPER_ADMIN' | 'PLATFORM_MANAGER' | 'PLATFORM_SUPPORT' | 'PLATFORM_SALES' | 'PLATFORM_ACCOUNTANT'
    | 'LAB_ADMIN' | 'BUSINESS_MANAGER' | 'MANAGER' | 'TECHNICIAN' | 'RECEPTIONIST';

// Platform roles (no tenant)
export const PLATFORM_ROLES: UserRole[] = ['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_ACCOUNTANT'];

// Tenant roles
export const TENANT_ROLES: UserRole[] = ['LAB_ADMIN', 'BUSINESS_MANAGER', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];

// Roles that LAB_ADMIN can create
export const LAB_ADMIN_CREATABLE_ROLES: UserRole[] = ['BUSINESS_MANAGER', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];

export class CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId?: string;
    password?: string; // Optional: SUPER_ADMIN can set a password directly
}

export class UpdateUserDto {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    status?: UserStatus;
}

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    async create(data: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        // Use provided password or generate temporary
        const password = data.password || uuidv4().substring(0, 8);
        const hash = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                tenantId: data.tenantId,
                passwordHash: hash,
                status: data.password ? UserStatus.ACTIVE : UserStatus.INVITED,
            },
        });

        // Send Invitation Email if no password was provided
        if (!data.password) {
            const setupLink = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/login?email=${data.email}`;
            // this.emailService.sendInvitation(user.email, password); 
        }

        return user;
    }

    async findAll(params: { tenantId?: string, search?: string }) {
        const { tenantId, search } = params;

        const where: any = {};
        if (tenantId) where.tenantId = tenantId;

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                lastLoginAt: true,
                tenant: { select: { name: true, id: true } }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }
}
