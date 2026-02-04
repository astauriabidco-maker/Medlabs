import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { getAllPermissions, PermissionValue, PERMISSION_METADATA, PERMISSIONS } from '../auth/permissions';
import * as bcrypt from 'bcrypt';

interface CreateRoleDto {
    name: string;
    description?: string;
    permissions: string[];
}

interface UpdateRoleDto {
    name?: string;
    description?: string;
    permissions?: string[];
}

interface CreateUserDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    customRoleId: string;
}

interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    customRoleId?: string;
    status?: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
}

@Injectable()
export class TeamService {
    constructor(private prisma: PrismaService) { }

    // ==================== ROLES ====================

    /**
     * Get all roles for a tenant
     */
    async getRoles(tenantId: string) {
        return this.prisma.role.findMany({
            where: { tenantId },
            include: {
                _count: { select: { users: true } },
            },
            orderBy: [
                { isSystem: 'desc' },
                { name: 'asc' },
            ],
        });
    }

    /**
     * Create a new role
     */
    async createRole(tenantId: string, dto: CreateRoleDto) {
        // Validate permissions
        const validPermissions = this.validatePermissions(dto.permissions);

        // Check for duplicate name
        const existing = await this.prisma.role.findUnique({
            where: { tenantId_name: { tenantId, name: dto.name } },
        });

        if (existing) {
            throw new ConflictException(`Role "${dto.name}" already exists`);
        }

        return this.prisma.role.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                permissions: validPermissions,
            },
        });
    }

    /**
     * Update a role
     */
    async updateRole(tenantId: string, roleId: string, dto: UpdateRoleDto) {
        const role = await this.prisma.role.findFirst({
            where: { id: roleId, tenantId },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        if (role.isSystem && dto.name) {
            throw new ForbiddenException('Cannot rename system roles');
        }

        const updateData: any = {};

        if (dto.name) updateData.name = dto.name;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.permissions) {
            updateData.permissions = this.validatePermissions(dto.permissions);
        }

        return this.prisma.role.update({
            where: { id: roleId },
            data: updateData,
        });
    }

    /**
     * Delete a role
     */
    async deleteRole(tenantId: string, roleId: string) {
        const role = await this.prisma.role.findFirst({
            where: { id: roleId, tenantId },
            include: { _count: { select: { users: true } } },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        if (role.isSystem) {
            throw new ForbiddenException('Cannot delete system roles');
        }

        if (role._count.users > 0) {
            throw new ForbiddenException(
                `Cannot delete role with ${role._count.users} assigned users. Reassign them first.`
            );
        }

        return this.prisma.role.delete({
            where: { id: roleId },
        });
    }

    // ==================== USERS ====================

    /**
     * Get all team members for a tenant
     */
    async getUsers(tenantId: string) {
        return this.prisma.user.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                customRoleId: true,
                customRole: {
                    select: { id: true, name: true, permissions: true },
                },
                status: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a new team member
     */
    async createUser(tenantId: string, dto: CreateUserDto) {
        // Check email uniqueness
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email already in use');
        }

        // Verify role belongs to tenant
        const role = await this.prisma.role.findFirst({
            where: { id: dto.customRoleId, tenantId },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 10);

        return this.prisma.user.create({
            data: {
                tenantId,
                email: dto.email,
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                customRoleId: dto.customRoleId,
                role: 'RECEPTIONIST', // Minimal role - actual permissions via customRoleId
                status: 'INVITED',
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                customRole: { select: { id: true, name: true } },
                status: true,
            },
        });
    }

    /**
     * Update a team member
     */
    async updateUser(tenantId: string, userId: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // If changing role, verify it belongs to tenant
        if (dto.customRoleId) {
            const role = await this.prisma.role.findFirst({
                where: { id: dto.customRoleId, tenantId },
            });
            if (!role) {
                throw new NotFoundException('Role not found');
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                customRoleId: dto.customRoleId,
                status: dto.status,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                customRole: { select: { id: true, name: true } },
                status: true,
            },
        });
    }

    /**
     * Soft delete a user
     */
    async deleteUser(tenantId: string, userId: string, currentUserId: string) {
        if (userId === currentUserId) {
            throw new ForbiddenException('Cannot delete yourself');
        }

        const user = await this.prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() },
        });
    }

    // ==================== PERMISSIONS ====================

    /**
     * Get all available permissions with metadata
     */
    getAvailablePermissions() {
        return Object.entries(PERMISSION_METADATA).map(([key, meta]) => ({
            key,
            ...meta,
        }));
    }

    /**
     * Seed default roles for a new tenant
     */
    async seedDefaultRoles(tenantId: string) {
        const defaultRoles = [
            {
                name: 'Administrateur',
                description: 'Accès complet à toutes les fonctionnalités',
                permissions: getAllPermissions(),
                isSystem: true,
            },
            {
                name: 'Technicien',
                description: 'Gestion des résultats et rendez-vous',
                permissions: [
                    PERMISSIONS.UPLOAD_SCAN,
                    PERMISSIONS.VIEW_RESULTS,
                    PERMISSIONS.MANAGE_APPOINTMENTS,
                    PERMISSIONS.HANDLE_ALERTS,
                ],
                isSystem: false,
            },
            {
                name: 'Secrétaire',
                description: 'Accès lecture seule et accueil',
                permissions: [
                    PERMISSIONS.VIEW_RESULTS,
                    PERMISSIONS.MANAGE_APPOINTMENTS,
                ],
                isSystem: false,
            },
        ];

        for (const role of defaultRoles) {
            await this.prisma.role.upsert({
                where: { tenantId_name: { tenantId, name: role.name } },
                update: {},
                create: { tenantId, ...role },
            });
        }
    }

    // ==================== HELPERS ====================

    private validatePermissions(permissions: string[]): PermissionValue[] {
        const allValid = getAllPermissions();
        const validated: PermissionValue[] = [];

        for (const perm of permissions) {
            if (allValid.includes(perm as PermissionValue)) {
                validated.push(perm as PermissionValue);
            }
        }

        return validated;
    }
}
