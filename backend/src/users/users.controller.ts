import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import {
  UsersService,
  CreateUserDto,
  UpdateUserDto,
  LAB_ADMIN_CREATABLE_ROLES,
  PLATFORM_ROLES,
  TENANT_ROLES,
  UserRole,
} from './users.service';
import { AuthService } from '../auth/auth.service';

// All available roles for SUPER_ADMIN selection
const ALL_ROLES: UserRole[] = [...PLATFORM_ROLES, ...TENANT_ROLES];

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  tenantId?: string;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Get available roles based on calling user's role
  @Get('available-roles')
  @Roles('SUPER_ADMIN', 'LAB_ADMIN')
  getAvailableRoles(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (user.role === 'SUPER_ADMIN') {
      return ALL_ROLES.map((r) => ({ value: r, label: r, canCreate: true }));
    }
    // LAB_ADMIN can only create specific roles
    return LAB_ADMIN_CREATABLE_ROLES.map((r) => ({
      value: r,
      label: r,
      canCreate: true,
    }));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'LAB_ADMIN')
  async findAll(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    const tenantId = user.role === 'LAB_ADMIN' ? user.tenantId : undefined;
    return this.usersService.findAll({ tenantId });
  }

  @Post()
  @Roles('SUPER_ADMIN', 'LAB_ADMIN')
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreateUserDto,
  ) {
    const user = req.user;

    // SUPER_ADMIN: can create any role in any tenant
    if (user.role === 'SUPER_ADMIN') {
      // No restrictions for Super Admin
      return this.usersService.create(createDto);
    }

    // LAB_ADMIN restrictions
    if (user.role === 'LAB_ADMIN') {
      // 1. Scope: Must create for their own tenant
      if (createDto.tenantId && createDto.tenantId !== user.tenantId) {
        throw new ForbiddenException('Cannot create user for another tenant');
      }
      createDto.tenantId = user.tenantId; // Enforce tenant

      // 2. Role Restriction: Can only create specific roles
      if (!LAB_ADMIN_CREATABLE_ROLES.includes(createDto.role)) {
        throw new ForbiddenException(
          `Lab Admins can only create: ${LAB_ADMIN_CREATABLE_ROLES.join(', ')}`,
        );
      }
    }

    return this.usersService.create(createDto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'LAB_ADMIN')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    const currentUser = req.user;
    const targetUser = await this.usersService.findOne(id);

    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    // SUPER_ADMIN: full access
    if (currentUser.role === 'SUPER_ADMIN') {
      return this.usersService.update(id, updateDto);
    }

    // LAB_ADMIN Security Guard
    if (currentUser.role === 'LAB_ADMIN') {
      // 1. Scope: Must be same tenant
      if (targetUser.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Access denied to this user');
      }
      // 2. Privilege: Cannot promote to SUPER_ADMIN or LAB_ADMIN
      if (
        updateDto.role &&
        !LAB_ADMIN_CREATABLE_ROLES.includes(updateDto.role)
      ) {
        throw new ForbiddenException('Cannot promote users to this role');
      }
    }

    return this.usersService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const targetUser = await this.usersService.findOne(id);
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }
    // Prevent self-deletion
    if (targetUser.id === req.user.id) {
      throw new ForbiddenException('Cannot delete yourself');
    }
    return this.usersService.delete(id);
  }

  @Post(':id/reset-password')
  @Roles('SUPER_ADMIN', 'LAB_ADMIN')
  async resetPassword(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const currentUser = req.user;
    const targetUser = await this.usersService.findOne(id);

    if (!targetUser) throw new BadRequestException('User not found');

    if (
      currentUser.role === 'LAB_ADMIN' &&
      targetUser.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.authService.requestPasswordReset(targetUser.email);
  }
}
