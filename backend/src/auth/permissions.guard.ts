import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { PermissionValue, LEGACY_ROLE_PERMISSIONS } from './permissions';

/**
 * Decorator to require specific permissions on a route
 * 
 * @example
 * @RequirePermissions('VIEW_STATS', 'MANAGE_FINANCE')
 * @Get('dashboard')
 * getDashboard() { ... }
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionValue[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * PermissionsGuard
 * 
 * Checks if the current user has the required permissions.
 * Works with both dynamic roles (customRole) and legacy enum roles.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required permissions from decorator
        const requiredPermissions = this.reflector.getAllAndOverride<PermissionValue[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no permissions required, allow access
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // Get user's permissions
        const userPermissions = await this.getUserPermissions(user);

        // Check if user has ALL required permissions
        const hasPermissions = requiredPermissions.every(
            (permission) => userPermissions.includes(permission),
        );

        if (!hasPermissions) {
            throw new ForbiddenException(
                `Missing required permissions: ${requiredPermissions.filter(
                    (p) => !userPermissions.includes(p),
                ).join(', ')}`,
            );
        }

        // Attach permissions to request for downstream use
        request.userPermissions = userPermissions;

        return true;
    }

    /**
     * Get user's permissions from either custom role or legacy enum
     */
    private async getUserPermissions(user: any): Promise<PermissionValue[]> {
        // If user has a custom role, fetch its permissions
        if (user.customRoleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: user.customRoleId },
                select: { permissions: true },
            });

            if (role) {
                return role.permissions as PermissionValue[];
            }
        }

        // Fallback to legacy enum role permissions
        const legacyRole = user.role as string;
        return LEGACY_ROLE_PERMISSIONS[legacyRole] || [];
    }
}
